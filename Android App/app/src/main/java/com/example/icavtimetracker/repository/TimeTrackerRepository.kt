package com.example.icavtimetracker.repository

import android.util.Log
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.data.User
import com.example.icavtimetracker.network.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class TimeTrackerRepository {
    private val apiService = NetworkClient.apiService
    private val dateFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    private val isoDateFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    private var authToken: String? = null
    
    fun setAuthToken(token: String) {
        authToken = token
    }
    
    suspend fun login(username: String, password: String): Result<Pair<String, User>> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d("TimeTrackerRepository", "Attempting login for user: $username")
                val request = LoginRequest(username = username, password = password)
                Log.d("TimeTrackerRepository", "Login request: $request")
                
                val response = apiService.login(request)
                Log.d("TimeTrackerRepository", "Login response code: ${response.code()}")
                Log.d("TimeTrackerRepository", "Login response body: ${response.body()}")
                
                if (response.isSuccessful) {
                    val authResponse = response.body()
                    if (authResponse != null) {
                        authToken = authResponse.token
                        Log.d("TimeTrackerRepository", "Login successful for user: ${authResponse.user.displayName}")
                        Result.success(Pair(authResponse.token, authResponse.user))
                    } else {
                        Log.e("TimeTrackerRepository", "Login response body is null")
                        Result.failure(Exception("Empty response"))
                    }
                } else {
                    Log.e("TimeTrackerRepository", "Login failed with code: ${response.code()}")
                    Log.e("TimeTrackerRepository", "Error body: ${response.errorBody()?.string()}")
                    Result.failure(Exception("Login failed: ${response.code()}"))
                }
            } catch (e: Exception) {
                Log.e("TimeTrackerRepository", "Login exception: ${e.message}", e)
                Result.failure(e)
            }
        }
    }
    
    suspend fun getTimeEntries(): Result<List<TimeEntry>> {
        return withContext(Dispatchers.IO) {
            try {
                val token = authToken ?: return@withContext Result.failure(Exception("No auth token available"))
                val response = apiService.getTimeEntries("Bearer $token")
                if (response.isSuccessful) {
                    val responseEntries = response.body() ?: emptyList()
                    val entries = responseEntries.map { convertResponseToTimeEntry(it) }
                    Result.success(entries)
                } else {
                    Result.failure(Exception("Failed to fetch time entries: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    suspend fun createTimeEntry(timeEntry: TimeEntry): Result<TimeEntry> {
        return withContext(Dispatchers.IO) {
            try {
                val token = authToken ?: return@withContext Result.failure(Exception("No auth token available"))
                
                Log.d("TimeTrackerRepository", "Creating time entry: ${timeEntry.id}")
                
                val request = TimeEntryRequest(
                    userId = timeEntry.userId,
                    technicianName = timeEntry.technicianName,
                    customerName = timeEntry.customerName,
                    clockInTime = timeEntry.clockInTime?.let { dateFormatter.format(it) },
                    clockOutTime = timeEntry.clockOutTime?.let { dateFormatter.format(it) },
                    lunchStartTime = timeEntry.lunchStartTime?.let { dateFormatter.format(it) },
                    lunchEndTime = timeEntry.lunchEndTime?.let { dateFormatter.format(it) },
                    driveStartTime = timeEntry.driveStartTime?.let { dateFormatter.format(it) },
                    driveEndTime = timeEntry.driveEndTime?.let { dateFormatter.format(it) }
                )
                
                val response = apiService.createTimeEntry("Bearer $token", request)
                Log.d("TimeTrackerRepository", "Create response code: ${response.code()}")
                
                if (response.isSuccessful) {
                    val responseEntry = response.body()
                    if (responseEntry != null) {
                        Log.d("TimeTrackerRepository", "Time entry created successfully with server ID: ${responseEntry.id}")
                        val createdEntry = timeEntry.copy(
                            serverId = responseEntry.id,
                            isSynced = true,
                            needsSync = false,
                            lastModified = Date()
                        )
                        Result.success(createdEntry)
                    } else {
                        Log.e("TimeTrackerRepository", "Create response body is null")
                        Result.failure(Exception("Empty response"))
                    }
                } else {
                    Log.e("TimeTrackerRepository", "Create failed with code: ${response.code()}")
                    Result.failure(Exception("Failed to create time entry: ${response.code()}"))
                }
            } catch (e: Exception) {
                Log.e("TimeTrackerRepository", "Create exception: ${e.message}", e)
                Result.failure(e)
            }
        }
    }
    
    suspend fun updateTimeEntry(timeEntry: TimeEntry): Result<TimeEntry> {
        return withContext(Dispatchers.IO) {
            try {
                val token = authToken ?: return@withContext Result.failure(Exception("No auth token available"))
                
                Log.d("TimeTrackerRepository", "Updating time entry with server ID: ${timeEntry.serverId}")
                
                val request = TimeEntryRequest(
                    id = timeEntry.serverId,
                    userId = timeEntry.userId,
                    technicianName = timeEntry.technicianName,
                    customerName = timeEntry.customerName,
                    clockInTime = timeEntry.clockInTime?.let { dateFormatter.format(it) },
                    clockOutTime = timeEntry.clockOutTime?.let { dateFormatter.format(it) },
                    lunchStartTime = timeEntry.lunchStartTime?.let { dateFormatter.format(it) },
                    lunchEndTime = timeEntry.lunchEndTime?.let { dateFormatter.format(it) },
                    driveStartTime = timeEntry.driveStartTime?.let { dateFormatter.format(it) },
                    driveEndTime = timeEntry.driveEndTime?.let { dateFormatter.format(it) }
                )
                
                val response = apiService.updateTimeEntry("Bearer $token", request)
                
                Log.d("TimeTrackerRepository", "Update response code: ${response.code()}")
                
                if (response.isSuccessful) {
                    val responseEntry = response.body()
                    if (responseEntry != null) {
                        Log.d("TimeTrackerRepository", "Time entry updated successfully")
                        val updatedEntry = timeEntry.copy(
                            serverId = responseEntry.id,
                            isSynced = true,
                            needsSync = false,
                            lastModified = Date()
                        )
                        Result.success(updatedEntry)
                    } else {
                        Log.e("TimeTrackerRepository", "Update response body is null")
                        Result.failure(Exception("Empty response"))
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    Log.e("TimeTrackerRepository", "Update failed with code: ${response.code()}")
                    Result.failure(Exception("Failed to update time entry: ${response.code()}"))
                }
            } catch (e: Exception) {
                Log.e("TimeTrackerRepository", "Error updating time entry", e)
                Result.failure(e)
            }
        }
    }
    
    private fun convertResponseToTimeEntry(response: TimeEntryResponse): TimeEntry {
        return TimeEntry(
            id = response.id, // This will be the server ID, but we'll override it in the ViewModel
            userId = response.userId,
            technicianName = response.technicianName,
            customerName = response.customerName,
            clockInTime = response.clockInTime?.let { parseDateString(it) },
            clockOutTime = response.clockOutTime?.let { parseDateString(it) },
            lunchStartTime = response.lunchStartTime?.let { parseDateString(it) },
            lunchEndTime = response.lunchEndTime?.let { parseDateString(it) },
            driveStartTime = response.driveStartTime?.let { parseDateString(it) },
            driveEndTime = response.driveEndTime?.let { parseDateString(it) },
            serverId = response.id,
            isSynced = true,
            needsSync = false
        )
    }
    
    private fun parseDateString(dateString: String): Date? {
        return try {
            // Try multiple ISO formats
            val isoFormats = listOf(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ssXXX"
            )
            
            for (format in isoFormats) {
                try {
                    val formatter = SimpleDateFormat(format, Locale.getDefault())
                    formatter.timeZone = TimeZone.getTimeZone("UTC")
                    val date = formatter.parse(dateString)
                    if (date != null) {
                        return date
                    }
                } catch (e: Exception) {
                    // Continue to next format
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun deleteTimeEntry(token: String, timeEntry: TimeEntry): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val serverId = timeEntry.serverId ?: return@withContext Result.failure(Exception("No server ID for deletion"))
                val response = apiService.deleteTimeEntry("Bearer $token", serverId)
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to delete time entry: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    suspend fun getUsers(token: String): Result<List<User>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getUsers("Bearer $token")
                if (response.isSuccessful) {
                    val users = response.body() ?: emptyList()
                    Result.success(users)
                } else {
                    Result.failure(Exception("Failed to fetch users: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    suspend fun healthCheck(): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.healthCheck()
                Result.success(response.isSuccessful)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
} 