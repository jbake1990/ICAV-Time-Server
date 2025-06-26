package com.example.icavtimetracker.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.icavtimetracker.data.ClockStatus
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.data.User
import com.example.icavtimetracker.repository.TimeTrackerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

class TimeTrackerViewModel : ViewModel() {
    private val repository = TimeTrackerRepository()
    
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
    
    // Computed properties
    val activeEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { it.isActive }
    
    val completedEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { !it.isActive }
    
    val pendingEntries: List<TimeEntry>
        get() = _timeEntries.value.filter { it.needsSync }
    
    // Authentication
    fun login(username: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            repository.login(username, password).fold(
                onSuccess = { (token, user) ->
                    _authToken.value = token
                    _currentUser.value = user
                    _isAuthenticated.value = true
                    loadTimeEntries()
                },
                onFailure = { exception ->
                    _error.value = exception.message ?: "Login failed"
                }
            )
            
            _isLoading.value = false
        }
    }
    
    fun logout() {
        _authToken.value = null
        _currentUser.value = null
        _isAuthenticated.value = false
        _timeEntries.value = emptyList()
        _currentEntry.value = null
        _clockStatus.value = ClockStatus.CLOCKED_OUT
        _pendingSyncCount.value = 0
    }
    
    // Time tracking
    fun clockIn(customerName: String) {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        // If we were driving, end the drive time and continue the same session
        if (_clockStatus.value == ClockStatus.DRIVING) {
            val drivingEntry = _currentEntry.value
            if (drivingEntry != null) {
                val updatedEntry = drivingEntry.copy(
                    driveEndTime = Date(),
                    lastModified = Date()
                )
                _currentEntry.value = updatedEntry
                _clockStatus.value = ClockStatus.CLOCKED_IN
                
                updateLocalEntry(updatedEntry)
                syncEntry(updatedEntry)
            }
        } else {
            // Create new entry for new customer session
            val newEntry = TimeEntry(
                userId = user.id,
                technicianName = user.displayName,
                customerName = customerName,
                clockInTime = Date()
            )
            
            _currentEntry.value = newEntry
            _clockStatus.value = ClockStatus.CLOCKED_IN
            _timeEntries.value = _timeEntries.value + newEntry
            
            // Sync immediately for real-time visibility
            syncEntry(newEntry)
        }
    }
    
    fun clockOut() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        val updatedEntry = entry.copy(
            clockOutTime = Date(),
            lastModified = Date()
        )
        _currentEntry.value = null
        _clockStatus.value = ClockStatus.CLOCKED_OUT
        
        updateLocalEntry(updatedEntry)
        syncEntry(updatedEntry)
    }
    
    fun startLunch() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        val updatedEntry = entry.copy(
            lunchStartTime = Date(),
            lastModified = Date()
        )
        _currentEntry.value = updatedEntry
        _clockStatus.value = ClockStatus.ON_LUNCH
        
        updateLocalEntry(updatedEntry)
        syncEntry(updatedEntry)
    }
    
    fun endLunch() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        val updatedEntry = entry.copy(
            lunchEndTime = Date(),
            lastModified = Date()
        )
        _currentEntry.value = updatedEntry
        _clockStatus.value = ClockStatus.CLOCKED_IN
        
        updateLocalEntry(updatedEntry)
        syncEntry(updatedEntry)
    }
    
    fun startDriving(customerName: String) {
        val user = _currentUser.value ?: return
        val token = _authToken.value ?: return
        
        val drivingEntry = TimeEntry(
            userId = user.id,
            technicianName = user.displayName,
            customerName = customerName,
            clockInTime = Date(),
            driveStartTime = Date()
        )
        
        _currentEntry.value = drivingEntry
        _clockStatus.value = ClockStatus.DRIVING
        _timeEntries.value = _timeEntries.value + drivingEntry
        
        // Sync immediately for real-time visibility
        syncEntry(drivingEntry)
    }
    
    fun endDriving() {
        val entry = _currentEntry.value ?: return
        val token = _authToken.value ?: return
        
        if (_clockStatus.value == ClockStatus.DRIVING) {
            val updatedEntry = entry.copy(
                driveEndTime = Date(),
                lastModified = Date()
            )
            _currentEntry.value = null
            _clockStatus.value = ClockStatus.CLOCKED_OUT
            
            updateLocalEntry(updatedEntry)
            syncEntry(updatedEntry)
        }
    }
    
    // Data management
    private fun updateLocalEntry(updatedEntry: TimeEntry) {
        _timeEntries.value = _timeEntries.value.map { entry ->
            // Match by local ID or server ID
            if (entry.id == updatedEntry.id || entry.serverId == updatedEntry.serverId) {
                updatedEntry
            } else {
                entry
            }
        }
    }
    
    fun loadTimeEntries() {
        viewModelScope.launch {
            _isLoading.value = true
            
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
                    
                    _timeEntries.value = processedEntries
                    
                    // Find current active entry
                    val activeEntry = processedEntries.find { it.isActive }
                    _currentEntry.value = activeEntry
                    
                    // Update clock status
                    _clockStatus.value = when {
                        activeEntry == null -> ClockStatus.CLOCKED_OUT
                        activeEntry.isOnLunch -> ClockStatus.ON_LUNCH
                        activeEntry.isDriving -> ClockStatus.DRIVING
                        else -> ClockStatus.CLOCKED_IN
                    }
                    
                    updatePendingSyncCount()
                },
                onFailure = { exception ->
                    _error.value = exception.message ?: "Failed to load time entries"
                }
            )
            
            _isLoading.value = false
        }
    }
    
    // Sync operations
    private fun syncEntry(entry: TimeEntry) {
        val token = _authToken.value ?: return
        
        viewModelScope.launch {
            try {
                android.util.Log.d("TimeTrackerViewModel", "Starting sync for entry: ${entry.id}")
                android.util.Log.d("TimeTrackerViewModel", "Entry serverId: ${entry.serverId}")
                android.util.Log.d("TimeTrackerViewModel", "Entry customer: ${entry.customerName}")
                android.util.Log.d("TimeTrackerViewModel", "Entry clockIn: ${entry.clockInTime}")
                android.util.Log.d("TimeTrackerViewModel", "Entry clockOut: ${entry.clockOutTime}")
                
                val result = if (entry.serverId == null) {
                    android.util.Log.d("TimeTrackerViewModel", "Creating new entry")
                    repository.createTimeEntry(entry)
                } else {
                    android.util.Log.d("TimeTrackerViewModel", "Updating existing entry with serverId: ${entry.serverId}")
                    repository.updateTimeEntry(entry)
                }
                
                result.fold(
                    onSuccess = { updatedEntry ->
                        android.util.Log.d("TimeTrackerViewModel", "Sync successful! Server ID: ${updatedEntry.serverId}")
                        
                        // Update the local entry with the server ID and mark as synced
                        val updatedLocalEntry = entry.copy(
                            serverId = updatedEntry.serverId,
                            isSynced = true,
                            needsSync = false,
                            lastModified = Date()
                        )
                        
                        android.util.Log.d("TimeTrackerViewModel", "Local entry updated with server ID")
                        
                        // Update the entry in the list
                        _timeEntries.value = _timeEntries.value?.map { 
                            if (it.id == entry.id) updatedLocalEntry else it 
                        } ?: emptyList()
                        
                        // Update current entry if it's the one being synced
                        if (_currentEntry.value?.id == entry.id) {
                            _currentEntry.value = updatedLocalEntry
                        }
                        
                        updatePendingSyncCount()
                    },
                    onFailure = { exception ->
                        android.util.Log.e("TimeTrackerViewModel", "Sync failed: ${exception.message}", exception)
                        // Mark the entry as needing sync
                        val failedEntry = entry.copy(
                            needsSync = true,
                            lastModified = Date()
                        )
                        _timeEntries.value = _timeEntries.value?.map { 
                            if (it.id == entry.id) failedEntry else it 
                        } ?: emptyList()
                        
                        updatePendingSyncCount()
                        _error.value = "Sync failed: ${exception.message}"
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("TimeTrackerViewModel", "Sync exception: ${e.message}", e)
                // Mark the entry as needing sync
                val failedEntry = entry.copy(
                    needsSync = true,
                    lastModified = Date()
                )
                _timeEntries.value = _timeEntries.value?.map { 
                    if (it.id == entry.id) failedEntry else it 
                } ?: emptyList()
                
                updatePendingSyncCount()
                _error.value = "Sync error: ${e.message}"
            }
        }
    }
    
    fun syncAllPending() {
        val token = _authToken.value ?: return
        val pendingEntries = _timeEntries.value.filter { it.needsSync }
        
        viewModelScope.launch {
            _isLoading.value = true
            
            pendingEntries.forEach { entry ->
                syncEntry(entry)
            }
            
            _isLoading.value = false
        }
    }
    
    private fun updatePendingSyncCount() {
        _pendingSyncCount.value = _timeEntries.value.count { it.needsSync }
    }
    
    fun clearError() {
        _error.value = null
    }
} 