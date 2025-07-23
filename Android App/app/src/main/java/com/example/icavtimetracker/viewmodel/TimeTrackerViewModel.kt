package com.example.icavtimetracker.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.icavtimetracker.AuthManager
import com.example.icavtimetracker.data.ClockStatus
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.data.User
import com.example.icavtimetracker.repository.TimeTrackerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.*
import kotlin.Result
import kotlinx.coroutines.delay

class TimeTrackerViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = TimeTrackerRepository()
    private val authManager = AuthManager(application)
    
    // State flows
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()
    
    private val _authToken = MutableStateFlow<String?>(null)
    val authToken: StateFlow<String?> = _authToken.asStateFlow()
    
    private val _timeEntries = MutableStateFlow<List<TimeEntry>>(emptyList())
    val timeEntries: StateFlow<List<TimeEntry>> = _timeEntries.asStateFlow()
    
    private val _currentEntry = MutableStateFlow<TimeEntry?>(null)
    val currentEntry: StateFlow<TimeEntry?> = _currentEntry.asStateFlow()
    
    private val _clockStatus = MutableStateFlow(ClockStatus.CLOCKED_OUT)
    val clockStatus: StateFlow<ClockStatus> = _clockStatus.asStateFlow()
    
    private val _pendingSyncCount = MutableStateFlow(0)
    val pendingSyncCount: StateFlow<Int> = _pendingSyncCount.asStateFlow()
    
    // Sync operations
    private val syncInProgress = mutableSetOf<String>() // Track ongoing syncs by entry ID
    
    init {
        // Check for existing authentication on app start
        checkExistingAuth()
        
        // Start periodic sync
        startPeriodicSync()
    }
    
    private fun checkExistingAuth() {
        viewModelScope.launch(Dispatchers.IO) {
            Log.d("TimeTrackerViewModel", "Checking existing authentication...")
            if (authManager.isAuthenticated()) {
                val savedToken = authManager.getAuthToken()
                val savedUser = authManager.getUser()
                
                Log.d("TimeTrackerViewModel", "Auth manager says authenticated")
                Log.d("TimeTrackerViewModel", "Saved token: ${savedToken?.take(10)}...")
                Log.d("TimeTrackerViewModel", "Saved user: ${savedUser?.displayName}")
                
                if (savedToken != null && savedUser != null) {
                    // Check if token needs verification
                    if (authManager.shouldVerifyToken()) {
                        Log.d("TimeTrackerViewModel", "Token needs verification, checking with server...")
                        try {
                            repository.verifySession(savedToken).fold(
                                onSuccess = { (token, user) ->
                                    Log.d("TimeTrackerViewModel", "Token verification successful")
                                    _authToken.value = token
                                    _currentUser.value = user
                                    _isAuthenticated.value = true
                                    repository.setAuthToken(token)
                                    authManager.saveAuthData(token, user, null) // Update with new token
                                    authManager.updateTokenVerification()
                                    loadTimeEntries()
                                },
                                onFailure = { exception ->
                                    Log.e("TimeTrackerViewModel", "Token verification failed: ${exception.message}")
                                    authManager.clearAuthData()
                                    _authToken.value = null
                                    _currentUser.value = null
                                    _isAuthenticated.value = false
                                }
                            )
                        } catch (e: Exception) {
                            Log.e("TimeTrackerViewModel", "Token verification exception: ${e.message}")
                            authManager.clearAuthData()
                            _authToken.value = null
                            _currentUser.value = null
                            _isAuthenticated.value = false
                        }
                    } else {
                        Log.d("TimeTrackerViewModel", "Token is recent, using cached authentication")
                        _authToken.value = savedToken
                        _currentUser.value = savedUser
                        _isAuthenticated.value = true
                        repository.setAuthToken(savedToken)
                        loadTimeEntries()
                    }
                } else {
                    Log.d("TimeTrackerViewModel", "Invalid saved authentication data, clearing")
                    authManager.clearAuthData()
                }
            } else {
                Log.d("TimeTrackerViewModel", "No existing authentication found")
            }
        }
    }
    
    // Computed properties
    val activeEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { it.isActive && isWithinTwoDays(it) }
    
    val completedEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { !it.isActive && isWithinTwoDays(it) }
    
    val pendingEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { it.needsSync && isWithinTwoDays(it) }
    
    // Filter entries to only show those from the last 2 days
    private fun isWithinTwoDays(entry: TimeEntry): Boolean {
        val twoDaysAgo = System.currentTimeMillis() - (2 * 24 * 60 * 60 * 1000)
        val entryTime = entry.clockInTime?.time ?: entry.lastModified.time
        return entryTime >= twoDaysAgo
    }
    
    // Authentication
    fun login(username: String, password: String) {
        viewModelScope.launch(Dispatchers.IO) {
            _isLoading.value = true
            _error.value = null
            
            try {
                repository.login(username, password).fold(
                    onSuccess = { (token, user) ->
                        _authToken.value = token
                        _currentUser.value = user
                        _isAuthenticated.value = true
                        
                        // Set the auth token in the repository for API calls
                        repository.setAuthToken(token)
                        
                        // Save authentication data for persistence with expiration
                        authManager.saveAuthData(token, user, null)
                        
                        Log.d("TimeTrackerViewModel", "Login successful for user: ${user.displayName}")
                        loadTimeEntries()
                    },
                    onFailure = { exception ->
                        _error.value = exception.message ?: "Login failed"
                        Log.e("TimeTrackerViewModel", "Login failed: ${exception.message}")
                    }
                )
            } catch (e: Exception) {
                _error.value = "Login error: ${e.message}"
                Log.e("TimeTrackerViewModel", "Login exception", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun logout() {
        Log.d("TimeTrackerViewModel", "Logging out user: ${_currentUser.value?.displayName}")
        
        viewModelScope.launch(Dispatchers.IO) {
            // Clear authentication data
            authManager.clearAuthData()
            
            // Clear auth token from repository
            repository.setAuthToken("")
            
            // Clear state
            _authToken.value = null
            _currentUser.value = null
            _isAuthenticated.value = false
            _timeEntries.value = emptyList()
            _currentEntry.value = null
            _clockStatus.value = ClockStatus.CLOCKED_OUT
            _pendingSyncCount.value = 0
        }
    }
    
    // Token verification and refresh
    fun verifyAndRefreshToken() {
        viewModelScope.launch(Dispatchers.IO) {
            val token = authManager.getAuthToken()
            if (token != null && authManager.shouldVerifyToken()) {
                Log.d("TimeTrackerViewModel", "Verifying token...")
                try {
                    repository.verifySession(token).fold(
                        onSuccess = { (newToken, user) ->
                            Log.d("TimeTrackerViewModel", "Token verification successful")
                            _authToken.value = newToken
                            _currentUser.value = user
                            _isAuthenticated.value = true
                            repository.setAuthToken(newToken)
                            authManager.saveAuthData(newToken, user, null)
                            authManager.updateTokenVerification()
                        },
                        onFailure = { exception ->
                            Log.e("TimeTrackerViewModel", "Token verification failed: ${exception.message}")
                            // Don't immediately logout, let the user continue with cached data
                            // They'll be prompted to login again on next API call
                        }
                    )
                } catch (e: Exception) {
                    Log.e("TimeTrackerViewModel", "Token verification exception: ${e.message}")
                }
            }
        }
    }
    
    // Time tracking
    fun clockIn(customerName: String) {
        val user = _currentUser.value
        val token = _authToken.value
        
        Log.d("TimeTrackerViewModel", "Clock in called with customer: $customerName")
        Log.d("TimeTrackerViewModel", "Current clock status: ${_clockStatus.value}")
        Log.d("TimeTrackerViewModel", "Current entry: ${_currentEntry.value?.id}")
        Log.d("TimeTrackerViewModel", "User: ${user?.displayName}")
        Log.d("TimeTrackerViewModel", "Token available: ${token != null}")
        
        if (user == null) {
            Log.e("TimeTrackerViewModel", "No user available for clock in")
            _error.value = "No user available. Please log in again."
            return
        }
        
        if (token == null) {
            Log.e("TimeTrackerViewModel", "No auth token available for clock in")
            _error.value = "Authentication token missing. Please log in again."
            return
        }
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Verify token before proceeding with API operations
                if (authManager.shouldVerifyToken()) {
                    Log.d("TimeTrackerViewModel", "Verifying token before clock in...")
                    try {
                        repository.verifySession(token).fold(
                            onSuccess = { (newToken, newUser) ->
                                Log.d("TimeTrackerViewModel", "Token verification successful")
                                _authToken.value = newToken
                                _currentUser.value = newUser
                                repository.setAuthToken(newToken)
                                authManager.saveAuthData(newToken, newUser, null)
                                authManager.updateTokenVerification()
                            },
                            onFailure = { exception ->
                                Log.e("TimeTrackerViewModel", "Token verification failed: ${exception.message}")
                                withContext(Dispatchers.Main) {
                                    _error.value = "Authentication expired. Please log in again."
                                    authManager.clearAuthData()
                                    _authToken.value = null
                                    _currentUser.value = null
                                    _isAuthenticated.value = false
                                }
                            }
                        )
                    } catch (e: Exception) {
                        Log.e("TimeTrackerViewModel", "Token verification exception: ${e.message}")
                        withContext(Dispatchers.Main) {
                            _error.value = "Authentication error. Please log in again."
                            authManager.clearAuthData()
                            _authToken.value = null
                            _currentUser.value = null
                            _isAuthenticated.value = false
                        }
                    }
                }
                
                // If we were driving, end the drive time and continue the same session
                if (_clockStatus.value == ClockStatus.DRIVING) {
                    Log.d("TimeTrackerViewModel", "Transitioning from driving to clocked in")
                    val drivingEntry = _currentEntry.value
                    if (drivingEntry != null) {
                        // Update the existing driving entry instead of creating a new one
                        val updatedEntry = drivingEntry.copy(
                            clockInTime = Date(),
                            driveEndTime = Date(),
                            lastModified = Date()
                        )
                        
                        // Update state on main dispatcher
                        withContext(Dispatchers.Main) {
                            _currentEntry.value = updatedEntry
                            _clockStatus.value = ClockStatus.CLOCKED_IN
                            
                            // Update the entry in the local list
                            val updatedList = _timeEntries.value.map { entry ->
                                if (entry.id == drivingEntry.id) updatedEntry else entry
                            }
                            _timeEntries.value = updatedList
                        }
                        
                        Log.d("TimeTrackerViewModel", "Updated driving entry to clocked in")
                        // Sync the updated entry
                        syncEntry(updatedEntry)
                    } else {
                        Log.e("TimeTrackerViewModel", "No driving entry found when transitioning to clocked in")
                        withContext(Dispatchers.Main) {
                            _error.value = "No driving entry found. Please try again."
                        }
                    }
                } else {
                    Log.d("TimeTrackerViewModel", "Creating new entry for clock in")
                    Log.d("TimeTrackerViewModel", "Current entries count: ${_timeEntries.value.size}")
                    Log.d("TimeTrackerViewModel", "Active entries: ${_timeEntries.value.filter { it.isActive }.size}")
                    
                    // Check if there's already an entry for this customer and user (active or not)
                    val existingEntry = _timeEntries.value.find { entry ->
                        entry.customerName == customerName && entry.userId == user.id
                    }
                    
                    if (existingEntry != null) {
                        Log.d("TimeTrackerViewModel", "Found existing entry for customer: ${existingEntry.id}")
                        Log.d("TimeTrackerViewModel", "Existing entry details: customer=${existingEntry.customerName}, user=${existingEntry.userId}, clockIn=${existingEntry.clockInTime}")
                        
                        if (existingEntry.clockInTime != null) {
                            // Entry is already clocked in
                            withContext(Dispatchers.Main) {
                                _currentEntry.value = existingEntry
                                _clockStatus.value = ClockStatus.CLOCKED_IN
                                _error.value = "Already clocked in for customer: $customerName"
                            }
                            return@launch
                        } else {
                            // Entry exists but not clocked in, update it
                            val updatedEntry = existingEntry.copy(
                                clockInTime = Date(),
                                lastModified = Date()
                            )
                            
                            withContext(Dispatchers.Main) {
                                _currentEntry.value = updatedEntry
                                _clockStatus.value = ClockStatus.CLOCKED_IN
                                
                                // Update the entry in the local list
                                val updatedList = _timeEntries.value.map { entry ->
                                    if (entry.id == existingEntry.id) updatedEntry else entry
                                }
                                _timeEntries.value = updatedList
                            }
                            
                            Log.d("TimeTrackerViewModel", "Updated existing entry with clock in time")
                            syncEntry(updatedEntry)
                            return@launch
                        }
                    }
                    
                    Log.d("TimeTrackerViewModel", "No existing entry found, creating new entry")
                    
                    // Create new entry for new customer session
                    val newEntry = TimeEntry(
                        userId = user.id,
                        technicianName = user.displayName,
                        customerName = customerName,
                        clockInTime = Date()
                    )
                    
                    // Update state on main dispatcher
                    withContext(Dispatchers.Main) {
                        _currentEntry.value = newEntry
                        _clockStatus.value = ClockStatus.CLOCKED_IN
                        _timeEntries.value = _timeEntries.value + newEntry
                    }
                    
                    Log.d("TimeTrackerViewModel", "Created new entry with work period: ${newEntry.id}")
                    // Sync immediately for real-time visibility
                    syncEntry(newEntry)
                }
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Clock in exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Clock in error: ${e.message}"
                }
            }
        }
    }
    
    fun clockOut() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val updatedEntry = entry.copy(
                    clockOutTime = Date(),
                    lastModified = Date()
                )
                
                // Update state on main dispatcher
                withContext(Dispatchers.Main) {
                    _currentEntry.value = null
                    _clockStatus.value = ClockStatus.CLOCKED_OUT
                    
                    // Update the entry in the local list
                    val updatedList = _timeEntries.value.map { listEntry ->
                        if (listEntry.id == entry.id) updatedEntry else listEntry
                    }
                    _timeEntries.value = updatedList
                }
                
                syncEntry(updatedEntry)
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Clock out exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Clock out error: ${e.message}"
                }
            }
        }
    }
    
    fun startLunch() {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val currentEntry = _currentEntry.value
                
                if (currentEntry != null) {
                    // User is clocked into a job, add lunch to that entry
                    val updatedEntry = currentEntry.copy(
                        lunchStartTime = Date(),
                        lastModified = Date()
                    )
                    _currentEntry.value = updatedEntry
                    _clockStatus.value = ClockStatus.ON_LUNCH
                    
                    // Update the entry in the local list
                    val updatedList = _timeEntries.value.map { listEntry ->
                        if (listEntry.id == currentEntry.id) updatedEntry else listEntry
                    }
                    _timeEntries.value = updatedList
                    
                    syncEntry(updatedEntry)
                } else {
                    // User is not clocked into a job, create a new lunch-only entry
                    val lunchEntry = TimeEntry(
                        userId = user.id,
                        technicianName = user.displayName,
                        customerName = "Lunch Break",
                        lunchStartTime = Date()
                    )
                    
                    // Update state on main dispatcher
                    withContext(Dispatchers.Main) {
                        _currentEntry.value = lunchEntry
                        _clockStatus.value = ClockStatus.ON_LUNCH
                        _timeEntries.value = _timeEntries.value + lunchEntry
                    }
                    
                    // Sync immediately for real-time visibility
                    syncEntry(lunchEntry)
                }
            } catch (e: Exception) {
                _error.value = "Start lunch error: ${e.message}"
                Log.e("TimeTrackerViewModel", "Start lunch exception", e)
            }
        }
    }
    
    fun endLunch() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val updatedEntry = entry.copy(
                    lunchEndTime = Date(),
                    lastModified = Date()
                )
                
                // Update the entry in the local list
                val updatedList = _timeEntries.value.map { listEntry ->
                    if (listEntry.id == entry.id) updatedEntry else listEntry
                }
                _timeEntries.value = updatedList
                
                // Determine next clock status
                val nextClockStatus = if (entry.clockInTime != null && entry.clockOutTime == null) {
                    // If this was a job entry with lunch, go back to CLOCKED_IN
                    _currentEntry.value = updatedEntry
                    ClockStatus.CLOCKED_IN
                } else {
                    // If this was a standalone lunch entry, go back to CLOCKED_OUT
                    _currentEntry.value = null
                    ClockStatus.CLOCKED_OUT
                }
                
                _clockStatus.value = nextClockStatus
                
                syncEntry(updatedEntry)
            } catch (e: Exception) {
                _error.value = "End lunch error: ${e.message}"
                Log.e("TimeTrackerViewModel", "End lunch exception", e)
            }
        }
    }
    
    fun createJob(customerName: String) {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                Log.d("TimeTrackerViewModel", "Creating new job for customer: $customerName")
                
                // Check if there's already an entry for this customer and user
                val existingEntry = _timeEntries.value.find { entry ->
                    entry.customerName == customerName && entry.userId == user.id
                }
                
                if (existingEntry != null) {
                    Log.d("TimeTrackerViewModel", "Found existing entry for customer: ${existingEntry.id}")
                    withContext(Dispatchers.Main) {
                        _currentEntry.value = existingEntry
                        _clockStatus.value = if (existingEntry.clockInTime != null) ClockStatus.CLOCKED_IN else ClockStatus.CLOCKED_OUT
                        _error.value = "Job already exists for customer: $customerName"
                    }
                    return@launch
                }
                
                // Create new entry without clocking in
                val newEntry = TimeEntry(
                    userId = user.id,
                    technicianName = user.displayName,
                    customerName = customerName
                    // No clockInTime - this creates a "clocked out" entry
                )
                
                // Update state on main dispatcher
                withContext(Dispatchers.Main) {
                    _currentEntry.value = newEntry
                    _clockStatus.value = ClockStatus.CLOCKED_OUT
                    _timeEntries.value = _timeEntries.value + newEntry
                    // The new job will automatically become selected since it's the most recent
                }
                
                Log.d("TimeTrackerViewModel", "Created new job: ${newEntry.id}")
                // Sync immediately for real-time visibility
                syncEntry(newEntry)
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Create job exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Create job error: ${e.message}"
                }
            }
        }
    }
    
    fun startDriving(customerName: String) {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                Log.d("TimeTrackerViewModel", "Starting driving for customer: $customerName")
                
                // Check if there's already an entry for this customer and user
                val existingEntry = _timeEntries.value.find { entry ->
                    entry.customerName == customerName && entry.userId == user.id
                }
                
                if (existingEntry != null) {
                    Log.d("TimeTrackerViewModel", "Found existing entry for customer: ${existingEntry.id}")
                    
                    if (existingEntry.driveStartTime != null && existingEntry.driveEndTime == null) {
                        // Already driving for this customer
                        withContext(Dispatchers.Main) {
                            _currentEntry.value = existingEntry
                            _clockStatus.value = ClockStatus.DRIVING
                            _error.value = "Already driving for customer: $customerName"
                        }
                        return@launch
                    } else {
                        // Entry exists but not driving, update it
                        val updatedEntry = existingEntry.copy(
                            driveStartTime = Date(),
                            lastModified = Date()
                        )
                        
                        withContext(Dispatchers.Main) {
                            _currentEntry.value = updatedEntry
                            _clockStatus.value = ClockStatus.DRIVING
                            
                            // Update the entry in the local list
                            val updatedList = _timeEntries.value.map { entry ->
                                if (entry.id == existingEntry.id) updatedEntry else entry
                            }
                            _timeEntries.value = updatedList
                        }
                        
                        Log.d("TimeTrackerViewModel", "Updated existing entry with drive start time")
                        syncEntry(updatedEntry)
                        return@launch
                    }
                }
                
                Log.d("TimeTrackerViewModel", "No existing entry found, creating new driving entry")
                
                // Create new driving entry
                val drivingEntry = TimeEntry(
                    userId = user.id,
                    technicianName = user.displayName,
                    customerName = customerName,
                    driveStartTime = Date()
                )
                
                // Update state on main dispatcher
                withContext(Dispatchers.Main) {
                    _currentEntry.value = drivingEntry
                    _clockStatus.value = ClockStatus.DRIVING
                    _timeEntries.value = _timeEntries.value + drivingEntry
                }
                
                // Sync immediately for real-time visibility
                syncEntry(drivingEntry)
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Start driving exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Start driving error: ${e.message}"
                }
            }
        }
    }
    
    fun endDriving() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                if (_clockStatus.value == ClockStatus.DRIVING) {
                    val updatedEntry = entry.copy(
                        driveEndTime = Date(),
                        lastModified = Date()
                    )
                    _currentEntry.value = null
                    _clockStatus.value = ClockStatus.CLOCKED_OUT
                    
                    // Update the entry in the local list
                    val updatedList = _timeEntries.value.map { listEntry ->
                        if (listEntry.id == entry.id) updatedEntry else listEntry
                    }
                    _timeEntries.value = updatedList
                    
                    syncEntry(updatedEntry)
                }
            } catch (e: Exception) {
                _error.value = "End driving error: ${e.message}"
                Log.e("TimeTrackerViewModel", "End driving exception", e)
            }
        }
    }
    
    // Data management
    private fun updateLocalEntry(updatedEntry: TimeEntry) {
        viewModelScope.launch(Dispatchers.Default) {
            val updatedList = _timeEntries.value.map { entry ->
                // Match by local ID or server ID
                if (entry.id == updatedEntry.id || entry.serverId == updatedEntry.serverId) {
                    updatedEntry
                } else {
                    entry
                }
            }
            _timeEntries.value = updatedList
        }
    }
    
    fun loadTimeEntries() {
        viewModelScope.launch(Dispatchers.IO) {
            _isLoading.value = true
            
            Log.d("TimeTrackerViewModel", "Loading time entries...")
            Log.d("TimeTrackerViewModel", "Current auth token: ${_authToken.value?.take(10)}...")
            
            try {
                // Verify token before loading entries
                val token = _authToken.value
                if (token != null && authManager.shouldVerifyToken()) {
                    Log.d("TimeTrackerViewModel", "Verifying token before loading entries...")
                    try {
                        repository.verifySession(token).fold(
                            onSuccess = { (newToken, newUser) ->
                                Log.d("TimeTrackerViewModel", "Token verification successful")
                                _authToken.value = newToken
                                _currentUser.value = newUser
                                repository.setAuthToken(newToken)
                                authManager.saveAuthData(newToken, newUser, null)
                                authManager.updateTokenVerification()
                            },
                            onFailure = { exception ->
                                Log.e("TimeTrackerViewModel", "Token verification failed: ${exception.message}")
                                authManager.clearAuthData()
                                withContext(Dispatchers.Main) {
                                    _authToken.value = null
                                    _currentUser.value = null
                                    _isAuthenticated.value = false
                                    _error.value = "Session expired. Please log in again."
                                }
                            }
                        )
                    } catch (e: Exception) {
                        Log.e("TimeTrackerViewModel", "Token verification exception: ${e.message}")
                        authManager.clearAuthData()
                        withContext(Dispatchers.Main) {
                            _authToken.value = null
                            _currentUser.value = null
                            _isAuthenticated.value = false
                            _error.value = "Authentication error. Please log in again."
                        }
                    }
                }
                
                repository.getTimeEntries().fold(
                    onSuccess = { entries ->
                        // Ensure all entries have lastModified set
                        val processedEntries = entries.map { entry ->
                            if (entry.lastModified == null) {
                                entry.copy(lastModified = Date())
                            } else {
                                entry
                            }
                        }
                        
                        // Find current active entry - prioritize the most recent one
                        val activeEntries = processedEntries.filter { it.isActive }
                        val activeEntry = if (activeEntries.isNotEmpty()) {
                            // Sort by lastModified to get the most recent active entry
                            activeEntries.sortedByDescending { it.lastModified }.first()
                        } else {
                            null
                        }
                        
                        // Update state on main dispatcher
                        withContext(Dispatchers.Main) {
                            _timeEntries.value = processedEntries
                            _currentEntry.value = activeEntry
                            
                            // Update clock status based on the active entry
                            _clockStatus.value = when {
                                activeEntry == null -> ClockStatus.CLOCKED_OUT
                                activeEntry.isOnLunch -> ClockStatus.ON_LUNCH
                                activeEntry.isDriving -> ClockStatus.DRIVING
                                activeEntry.clockInTime != null && activeEntry.clockOutTime == null -> ClockStatus.CLOCKED_IN
                                else -> ClockStatus.CLOCKED_OUT
                            }
                        }
                        
                        Log.d("TimeTrackerViewModel", "Loaded ${processedEntries.size} entries")
                        Log.d("TimeTrackerViewModel", "Active entry: ${activeEntry?.id}")
                        Log.d("TimeTrackerViewModel", "Clock status: ${_clockStatus.value}")
                        
                        updatePendingSyncCount()
                    },
                    onFailure = { exception ->
                        Log.e("TimeTrackerViewModel", "Load time entries failed: ${exception.message}", exception)
                        
                        // Check if this is an authentication error
                        if (exception.message?.contains("401") == true || exception.message?.contains("Unauthorized") == true) {
                            Log.d("TimeTrackerViewModel", "Authentication error detected, clearing saved auth data")
                            authManager.clearAuthData()
                            withContext(Dispatchers.Main) {
                                _authToken.value = null
                                _currentUser.value = null
                                _isAuthenticated.value = false
                                _error.value = "Session expired. Please log in again."
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                _error.value = exception.message ?: "Failed to load time entries"
                            }
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Load time entries exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Load error: ${e.message}"
                }
            } finally {
                withContext(Dispatchers.Main) {
                    _isLoading.value = false
                }
            }
        }
    }
    
    // Sync operations
    private fun syncEntry(entry: TimeEntry) {
        val token = _authToken.value ?: return
        
        // Prevent duplicate syncs for the same entry
        if (syncInProgress.contains(entry.id)) {
            Log.d("TimeTrackerViewModel", "Sync already in progress for entry: ${entry.id}")
            return
        }
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                syncInProgress.add(entry.id)
                Log.d("TimeTrackerViewModel", "Starting sync for entry: ${entry.id}")
                
                // Verify token before syncing
                if (authManager.shouldVerifyToken()) {
                    Log.d("TimeTrackerViewModel", "Verifying token before sync...")
                    try {
                        repository.verifySession(token).fold(
                            onSuccess = { (newToken, newUser) ->
                                Log.d("TimeTrackerViewModel", "Token verification successful")
                                _authToken.value = newToken
                                _currentUser.value = newUser
                                repository.setAuthToken(newToken)
                                authManager.saveAuthData(newToken, newUser, null)
                                authManager.updateTokenVerification()
                            },
                            onFailure = { exception ->
                                Log.e("TimeTrackerViewModel", "Token verification failed: ${exception.message}")
                                authManager.clearAuthData()
                                withContext(Dispatchers.Main) {
                                    _authToken.value = null
                                    _currentUser.value = null
                                    _isAuthenticated.value = false
                                    _error.value = "Session expired. Please log in again."
                                }
                                syncInProgress.remove(entry.id)
                            }
                        )
                    } catch (e: Exception) {
                        Log.e("TimeTrackerViewModel", "Token verification exception: ${e.message}")
                        authManager.clearAuthData()
                        withContext(Dispatchers.Main) {
                            _authToken.value = null
                            _currentUser.value = null
                            _isAuthenticated.value = false
                            _error.value = "Authentication error. Please log in again."
                        }
                        syncInProgress.remove(entry.id)
                    }
                }
                
                val result = if (entry.serverId == null) {
                    Log.d("TimeTrackerViewModel", "Creating new entry")
                    repository.createTimeEntry(entry)
                } else {
                    Log.d("TimeTrackerViewModel", "Updating existing entry with serverId: ${entry.serverId}")
                    repository.updateTimeEntry(entry)
                }
                
                result.fold(
                    onSuccess = { updatedEntry ->
                        Log.d("TimeTrackerViewModel", "Sync successful! Server ID: ${updatedEntry.serverId}")
                        
                        // Update the local entry with the server ID and mark as synced
                        val updatedLocalEntry = entry.copy(
                            serverId = updatedEntry.serverId,
                            isSynced = true,
                            needsSync = false,
                            lastModified = Date()
                        )
                        
                        // Update state on main dispatcher
                        withContext(Dispatchers.Main) {
                            // Update the entry in the list
                            val updatedList = _timeEntries.value.map { 
                                if (it.id == entry.id) updatedLocalEntry else it 
                            }
                            _timeEntries.value = updatedList
                            
                            // Update current entry if it's the one being synced
                            if (_currentEntry.value?.id == entry.id) {
                                _currentEntry.value = updatedLocalEntry
                            }
                        }
                        
                        updatePendingSyncCount()
                    },
                    onFailure = { exception ->
                        Log.e("TimeTrackerViewModel", "Sync failed: ${exception.message}", exception)
                        
                        // Check if this is an authentication error
                        if (exception.message?.contains("401") == true || exception.message?.contains("Unauthorized") == true) {
                            Log.d("TimeTrackerViewModel", "Authentication error detected during sync, clearing saved auth data")
                            authManager.clearAuthData()
                            withContext(Dispatchers.Main) {
                                _authToken.value = null
                                _currentUser.value = null
                                _isAuthenticated.value = false
                                _error.value = "Session expired. Please log in again."
                            }
                        } else if (exception.message?.contains("Active entry already exists") == true) {
                            Log.d("TimeTrackerViewModel", "Server returned 409 - active entry already exists")
                            // Remove the duplicate entry from local list
                            withContext(Dispatchers.Main) {
                                val updatedList = _timeEntries.value.filter { it.id != entry.id }
                                _timeEntries.value = updatedList
                                
                                if (_currentEntry.value?.id == entry.id) {
                                    _currentEntry.value = null
                                    _clockStatus.value = ClockStatus.CLOCKED_OUT
                                }
                                
                                _error.value = "Active entry already exists for this customer"
                            }
                            
                            updatePendingSyncCount()
                        } else {
                            // Mark the entry as needing sync
                            val failedEntry = entry.copy(
                                needsSync = true,
                                lastModified = Date()
                            )
                            
                            withContext(Dispatchers.Main) {
                                val updatedList = _timeEntries.value.map { 
                                    if (it.id == entry.id) failedEntry else it 
                                }
                                _timeEntries.value = updatedList
                                
                                if (_currentEntry.value?.id == entry.id) {
                                    _currentEntry.value = failedEntry
                                }
                            }
                            
                            updatePendingSyncCount()
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Sync exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Sync error: ${e.message}"
                }
            } finally {
                syncInProgress.remove(entry.id)
            }
        }
    }
    
    fun syncAllPending() {
        val token = _authToken.value ?: return
        val pendingEntries = _timeEntries.value.filter { it.needsSync }
        
        viewModelScope.launch(Dispatchers.IO) {
            _isLoading.value = true
            
            try {
                // Sync entries sequentially to prevent race conditions
                pendingEntries.forEach { entry ->
                    syncEntry(entry)
                    // Small delay between syncs to prevent overwhelming the server
                    kotlinx.coroutines.delay(100)
                }
            } catch (e: Exception) {
                _error.value = "Sync all error: ${e.message}"
                Log.e("TimeTrackerViewModel", "Sync all exception", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private fun updatePendingSyncCount() {
        viewModelScope.launch(Dispatchers.Default) {
            _pendingSyncCount.value = _timeEntries.value.count { it.needsSync }
        }
    }
    
    fun clearError() {
        _error.value = null
    }
    
    // Force refresh app state from server
    fun refreshAppState() {
        Log.d("TimeTrackerViewModel", "Force refreshing app state from server")
        loadTimeEntries()
    }
    
    // Reset local state if it gets corrupted
    fun resetLocalState() {
        Log.d("TimeTrackerViewModel", "Resetting local state")
        viewModelScope.launch(Dispatchers.Main) {
            _currentEntry.value = null
            _clockStatus.value = ClockStatus.CLOCKED_OUT
            _pendingSyncCount.value = 0
            _error.value = null
        }
        loadTimeEntries()
    }
    
    // Delete entry functionality
    fun deleteEntry(entry: TimeEntry) {
        Log.d("TimeTrackerViewModel", "Deleting entry: ${entry.customerName} (ID: ${entry.id})")
        Log.d("TimeTrackerViewModel", "Entry serverId: ${entry.serverId}")
        Log.d("TimeTrackerViewModel", "Entry isSynced: ${entry.isSynced}")
        Log.d("TimeTrackerViewModel", "Entry needsSync: ${entry.needsSync}")
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Remove the entry from the local list immediately
                withContext(Dispatchers.Main) {
                    val updatedList = _timeEntries.value.filter { it.id != entry.id }
                    _timeEntries.value = updatedList
                    
                    // If we're deleting the active entry, update status
                    if (_currentEntry.value?.id == entry.id) {
                        _currentEntry.value = null
                        _clockStatus.value = ClockStatus.CLOCKED_OUT
                    }
                }
                
                // Delete from server if it has a server ID
                if (entry.serverId != null) {
                    Log.d("TimeTrackerViewModel", "Attempting to delete from server with serverId: ${entry.serverId}")
                    Log.d("TimeTrackerViewModel", "Full delete URL will be: https://icav-time-server.vercel.app/api/time-entries/${entry.serverId}")
                    repository.deleteTimeEntry(entry).fold(
                        onSuccess = { success ->
                            Log.d("TimeTrackerViewModel", "Entry deleted from server successfully")
                        },
                        onFailure = { exception ->
                            Log.e("TimeTrackerViewModel", "Delete from server failed: ${exception.message}", exception)
                            // Don't restore the entry - let it stay deleted locally
                        }
                    )
                } else {
                    Log.d("TimeTrackerViewModel", "Entry deleted locally only (no server ID)")
                    Log.d("TimeTrackerViewModel", "Entry sync status - isSynced: ${entry.isSynced}, needsSync: ${entry.needsSync}")
                }
                
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Delete entry failed: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Delete failed: ${e.message}"
                }
            }
        }
    }
    
    // Edit timestamp functionality
    fun editTimeEntry(
        entry: TimeEntry,
        clockInTime: Date? = null,
        clockOutTime: Date? = null,
        lunchStartTime: Date? = null,
        lunchEndTime: Date? = null,
        driveStartTime: Date? = null,
        driveEndTime: Date? = null
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                Log.d("TimeTrackerViewModel", "Editing time entry: ${entry.customerName}")
                
                val updatedEntry = entry.copy(
                    clockInTime = clockInTime ?: entry.clockInTime,
                    clockOutTime = clockOutTime ?: entry.clockOutTime,
                    lunchStartTime = lunchStartTime ?: entry.lunchStartTime,
                    lunchEndTime = lunchEndTime ?: entry.lunchEndTime,
                    driveStartTime = driveStartTime ?: entry.driveStartTime,
                    driveEndTime = driveEndTime ?: entry.driveEndTime,
                    lastModified = Date(),
                    needsSync = true
                )
                
                // Update the entry in the local list
                withContext(Dispatchers.Main) {
                    val updatedList = _timeEntries.value.map { 
                        if (it.id == entry.id) updatedEntry else it 
                    }
                    _timeEntries.value = updatedList
                    
                    // Update current entry if it's the one being edited
                    if (_currentEntry.value?.id == entry.id) {
                        _currentEntry.value = updatedEntry
                    }
                }
                
                Log.d("TimeTrackerViewModel", "Updated time entry: ${updatedEntry.id}")
                // Sync the updated entry
                syncEntry(updatedEntry)
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Edit time entry exception", e)
                withContext(Dispatchers.Main) {
                    _error.value = "Edit error: ${e.message}"
                }
            }
        }
    }
    

    
    // Debug method to test if ViewModel is responsive
    fun testResponse() {
        Log.d("TimeTrackerViewModel", "Test response called")
        viewModelScope.launch(Dispatchers.Main) {
            _error.value = "Test response: ViewModel is working! Current status: ${_clockStatus.value}"
        }
    }

    private fun startPeriodicSync() {
        viewModelScope.launch(Dispatchers.IO) {
            while (true) {
                try {
                    delay(5 * 60 * 1000) // 5 minutes
                    if (_isAuthenticated.value && _authToken.value != null) {
                        Log.d("TimeTrackerViewModel", "Running periodic sync...")
                        performPeriodicSync()
                    }
                } catch (e: Exception) {
                    Log.e("TimeTrackerViewModel", "Periodic sync error: ${e.message}")
                }
            }
        }
    }
    
    private suspend fun performPeriodicSync() {
        try {
            // Sync pending entries
            val pendingEntries = _timeEntries.value.filter { it.needsSync }
            Log.d("TimeTrackerViewModel", "Syncing ${pendingEntries.size} pending entries")
            
            for (entry in pendingEntries) {
                if (!syncInProgress.contains(entry.id)) {
                    syncInProgress.add(entry.id)
                    try {
                        syncEntry(entry)
                    } finally {
                        syncInProgress.remove(entry.id)
                    }
                }
            }
            
            // Refresh data from server
            loadTimeEntries()
            
            Log.d("TimeTrackerViewModel", "Periodic sync completed")
        } catch (e: Exception) {
            Log.e("TimeTrackerViewModel", "Periodic sync failed: ${e.message}")
        }
    }
} 