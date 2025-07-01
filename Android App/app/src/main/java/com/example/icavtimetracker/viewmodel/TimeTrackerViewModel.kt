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
    }
    
    private fun checkExistingAuth() {
        viewModelScope.launch(Dispatchers.IO) {
            if (authManager.isAuthenticated()) {
                val savedToken = authManager.getAuthToken()
                val savedUser = authManager.getUser()
                
                if (savedToken != null && savedUser != null) {
                    Log.d("TimeTrackerViewModel", "Found existing authentication for user: ${savedUser.displayName}")
                    _authToken.value = savedToken
                    _currentUser.value = savedUser
                    _isAuthenticated.value = true
                    
                    // Set the auth token in the repository for API calls
                    repository.setAuthToken(savedToken)
                    
                    // Load time entries for the authenticated user
                    loadTimeEntries()
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
        get() = _timeEntries.value.filter { it.isActive }
    
    val completedEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { !it.isActive }
    
    val pendingEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { it.needsSync }
    
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
                        
                        // Save authentication data for persistence
                        authManager.saveAuthData(token, user)
                        
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
                    
                    Log.d("TimeTrackerViewModel", "Created new entry for clock in: ${newEntry.id}")
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
    
    fun startDriving(customerName: String) {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        viewModelScope.launch(Dispatchers.IO) {
            try {
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
            
            try {
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
                        Log.e("TimeTrackerViewModel", "Load time entries failed", exception)
                        withContext(Dispatchers.Main) {
                            _error.value = exception.message ?: "Failed to load time entries"
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
                            _error.value = "Sync failed: ${exception.message}"
                        }
                        
                        updatePendingSyncCount()
                    }
                )
            } catch (e: Exception) {
                Log.e("TimeTrackerViewModel", "Sync exception: ${e.message}", e)
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
                    _error.value = "Sync error: ${e.message}"
                }
                
                updatePendingSyncCount()
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
    
    // Debug method to test if ViewModel is responsive
    fun testResponse() {
        Log.d("TimeTrackerViewModel", "Test response called")
        viewModelScope.launch(Dispatchers.Main) {
            _error.value = "Test response: ViewModel is working! Current status: ${_clockStatus.value}"
        }
    }
} 