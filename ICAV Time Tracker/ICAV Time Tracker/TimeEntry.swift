//
//  TimeEntry.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation

struct TimeEntry: Identifiable, Codable {
    var id: UUID
    let userId: String
    let technicianName: String
    let customerName: String
    let clockInTime: Date
    var clockOutTime: Date?
    var lunchStartTime: Date?
    var lunchEndTime: Date?
    
    // Sync tracking
    var serverId: String? // ID from the server after successful sync
    var isSynced: Bool = false // Whether this entry has been synced to server
    var needsSync: Bool = false // Whether this entry has local changes that need syncing
    var lastModified: Date = Date() // When this entry was last modified locally
    
    // Custom initializer to generate UUID
    init(userId: String, technicianName: String, customerName: String, clockInTime: Date, clockOutTime: Date? = nil, lunchStartTime: Date? = nil, lunchEndTime: Date? = nil) {
        self.id = UUID()
        self.userId = userId
        self.technicianName = technicianName
        self.customerName = customerName
        self.clockInTime = clockInTime
        self.clockOutTime = clockOutTime
        self.lunchStartTime = lunchStartTime
        self.lunchEndTime = lunchEndTime
    }
    
    var isActive: Bool {
        return clockOutTime == nil
    }
    
    var isOnLunch: Bool {
        return lunchStartTime != nil && lunchEndTime == nil
    }
    
    var duration: TimeInterval? {
        guard let clockOutTime = clockOutTime else { return nil }
        return clockOutTime.timeIntervalSince(clockInTime)
    }
    
    var formattedDuration: String? {
        guard let duration = duration else { return nil }
        let hours = Int(duration) / 3600
        let minutes = Int(duration) % 3600 / 60
        return String(format: "%02d:%02d", hours, minutes)
    }
    
    var lunchDuration: TimeInterval? {
        guard let lunchStart = lunchStartTime, let lunchEnd = lunchEndTime else { return nil }
        return lunchEnd.timeIntervalSince(lunchStart)
    }
    
    var formattedLunchDuration: String? {
        guard let duration = lunchDuration else { return nil }
        let hours = Int(duration) / 3600
        let minutes = Int(duration) % 3600 / 60
        return String(format: "%02d:%02d", hours, minutes)
    }
    
    // Helper methods for sync management
    mutating func markForSync() {
        needsSync = true
        lastModified = Date()
    }
    
    mutating func markAsSynced(serverId: String) {
        self.serverId = serverId
        isSynced = true
        needsSync = false
    }
    
    var syncStatus: String {
        if isSynced {
            return "✅ Synced"
        } else if needsSync {
            return "📤 Pending sync"
        } else {
            return "📱 Local only"
        }
    }
}

enum ClockStatus {
    case clockedOut
    case clockedIn(TimeEntry)
    case onLunch(TimeEntry)
} 