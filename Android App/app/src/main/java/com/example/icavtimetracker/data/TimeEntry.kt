package com.example.icavtimetracker.data

import com.google.gson.annotations.SerializedName
import java.util.Date
import java.util.UUID

data class TimeEntry(
    val id: String = UUID.randomUUID().toString(),
    @SerializedName("userId")
    val userId: String,
    @SerializedName("technicianName")
    val technicianName: String,
    @SerializedName("customerName")
    val customerName: String,
    
    @SerializedName("clockInTime")
    val clockInTime: Date? = null,
    @SerializedName("clockOutTime")
    var clockOutTime: Date? = null,
    @SerializedName("lunchStartTime")
    var lunchStartTime: Date? = null,
    @SerializedName("lunchEndTime")
    var lunchEndTime: Date? = null,
    @SerializedName("driveStartTime")
    var driveStartTime: Date? = null,
    @SerializedName("driveEndTime")
    var driveEndTime: Date? = null,
    
    // Sync tracking
    @SerializedName("serverId")
    var serverId: String? = null,
    var isSynced: Boolean = false,
    var needsSync: Boolean = false,
    var lastModified: Date = Date()
) {
    val isActive: Boolean
        get() = clockOutTime == null
    
    val isOnLunch: Boolean
        get() = lunchStartTime != null && lunchEndTime == null
    
    val isDriving: Boolean
        get() = driveStartTime != null && driveEndTime == null
    
    val duration: Long?
        get() = clockOutTime?.let { clockOut ->
            clockInTime?.let { clockIn ->
                clockOut.time - clockIn.time
            }
        }
    
    val formattedDuration: String?
        get() = duration?.let { durationMs ->
            val hours = (durationMs / (1000 * 60 * 60)).toInt()
            val minutes = ((durationMs % (1000 * 60 * 60)) / (1000 * 60)).toInt()
            String.format("%02d:%02d", hours, minutes)
        }
    
    val lunchDuration: Long?
        get() = if (lunchStartTime != null && lunchEndTime != null) {
            lunchEndTime!!.time - lunchStartTime!!.time
        } else null
    
    val formattedLunchDuration: String?
        get() = lunchDuration?.let { durationMs ->
            val hours = (durationMs / (1000 * 60 * 60)).toInt()
            val minutes = ((durationMs % (1000 * 60 * 60)) / (1000 * 60)).toInt()
            String.format("%02d:%02d", hours, minutes)
        }
    
    val driveDuration: Long?
        get() = if (driveStartTime != null && driveEndTime != null) {
            driveEndTime!!.time - driveStartTime!!.time
        } else null
    
    val formattedDriveDuration: String?
        get() = driveDuration?.let { durationMs ->
            val hours = (durationMs / (1000 * 60 * 60)).toInt()
            val minutes = ((durationMs % (1000 * 60 * 60)) / (1000 * 60)).toInt()
            String.format("%02d:%02d", hours, minutes)
        }
    

    
    fun markForSync() {
        needsSync = true
        lastModified = Date()
    }
    
    fun markAsSynced(serverId: String) {
        this.serverId = serverId
        isSynced = true
        needsSync = false
    }
    
    val syncStatus: String
        get() = when {
            isSynced -> "✅ Synced"
            needsSync -> "📤 Pending sync"
            else -> "📱 Local only"
        }
}

enum class ClockStatus {
    CLOCKED_OUT,
    DRIVING,
    CLOCKED_IN,
    ON_LUNCH
} 