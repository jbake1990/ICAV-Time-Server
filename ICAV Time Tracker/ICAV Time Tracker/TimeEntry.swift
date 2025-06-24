//
//  TimeEntry.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation

struct TimeEntry: Identifiable, Codable {
    let id = UUID()
    let userId: String
    let technicianName: String
    let customerName: String
    let clockInTime: Date
    var clockOutTime: Date?
    var lunchStartTime: Date?
    var lunchEndTime: Date?
    
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
}

enum ClockStatus {
    case clockedOut
    case clockedIn(TimeEntry)
    case onLunch(TimeEntry)
} 