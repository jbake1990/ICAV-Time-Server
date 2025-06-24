//
//  TimeTrackerViewModel.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation
import SwiftUI

@MainActor
class TimeTrackerViewModel: ObservableObject {
    @Published var customerName: String = ""
    @Published var timeEntries: [TimeEntry] = []
    @Published var currentStatus: ClockStatus = .clockedOut
    @Published var showingAlert = false
    @Published var alertMessage = ""
    
    private let userDefaults = UserDefaults.standard
    private let timeEntriesKey = "TimeEntries"
    private let authManager: AuthManager
    
    init(authManager: AuthManager) {
        self.authManager = authManager
        loadData()
    }
    
    func clockIn() {
        guard let currentUser = authManager.currentUser else {
            showAlert("Please log in to use the time tracker")
            return
        }
        
        guard !customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            showAlert("Please enter the customer name")
            return
        }
        
        let newEntry = TimeEntry(
            userId: currentUser.id,
            technicianName: currentUser.displayName,
            customerName: customerName.trimmingCharacters(in: .whitespacesAndNewlines),
            clockInTime: Date()
        )
        
        timeEntries.append(newEntry)
        currentStatus = .clockedIn(newEntry)
        saveData()
        
        // Clear customer name for next entry
        customerName = ""
    }
    
    func clockOut() {
        guard case .clockedIn(let activeEntry) = currentStatus else {
            showAlert("No active time entry to clock out")
            return
        }
        
        if let index = timeEntries.firstIndex(where: { $0.id == activeEntry.id }) {
            timeEntries[index].clockOutTime = Date()
            currentStatus = .clockedOut
            saveData()
        }
    }
    
    func startLunch() {
        guard let currentUser = authManager.currentUser else {
            showAlert("Please log in to use the time tracker")
            return
        }
        
        switch currentStatus {
        case .clockedIn(let activeEntry):
            // Start lunch for active job
            if let index = timeEntries.firstIndex(where: { $0.id == activeEntry.id }) {
                timeEntries[index].lunchStartTime = Date()
                currentStatus = .onLunch(timeEntries[index])
                saveData()
            }
            
        case .clockedOut:
            // Create a lunch-only entry
            let lunchEntry = TimeEntry(
                userId: currentUser.id,
                technicianName: currentUser.displayName,
                customerName: "Lunch Break",
                clockInTime: Date(),
                lunchStartTime: Date()
            )
            
            timeEntries.append(lunchEntry)
            currentStatus = .onLunch(lunchEntry)
            saveData()
            
        case .onLunch:
            showAlert("Already on lunch break")
        }
    }
    
    func endLunch() {
        guard case .onLunch(let lunchEntry) = currentStatus else {
            showAlert("No active lunch break to end")
            return
        }
        
        if let index = timeEntries.firstIndex(where: { $0.id == lunchEntry.id }) {
            timeEntries[index].lunchEndTime = Date()
            
            // If this was a lunch-only entry, clock out completely
            if timeEntries[index].customerName == "Lunch Break" {
                timeEntries[index].clockOutTime = Date()
                currentStatus = .clockedOut
            } else {
                // Return to active job
                currentStatus = .clockedIn(timeEntries[index])
            }
            
            saveData()
        }
    }
    
    func deleteEntry(_ entry: TimeEntry) {
        timeEntries.removeAll { $0.id == entry.id }
        
        // If we're deleting the active entry, update status
        if case .clockedIn(let activeEntry) = currentStatus, activeEntry.id == entry.id {
            currentStatus = .clockedOut
        } else if case .onLunch(let lunchEntry) = currentStatus, lunchEntry.id == entry.id {
            currentStatus = .clockedOut
        }
        
        saveData()
    }
    
    private func saveData() {
        // Save time entries
        if let encoded = try? JSONEncoder().encode(timeEntries) {
            userDefaults.set(encoded, forKey: timeEntriesKey)
        }
    }
    
    private func loadData() {
        // Load time entries
        if let data = userDefaults.data(forKey: timeEntriesKey),
           let decoded = try? JSONDecoder().decode([TimeEntry].self, from: data) {
            timeEntries = decoded
        }
        
        // Check for active entry for current user
        if let currentUser = authManager.currentUser {
            if let activeEntry = timeEntries.first(where: { $0.isActive && $0.userId == currentUser.id }) {
                if activeEntry.isOnLunch {
                    currentStatus = .onLunch(activeEntry)
                } else {
                    currentStatus = .clockedIn(activeEntry)
                }
            }
        }
    }
    
    private func showAlert(_ message: String) {
        alertMessage = message
        showingAlert = true
    }
    
    func exportData() -> String {
        var csv = "Technician,Username,Customer,Clock In,Clock Out,Duration,Lunch Start,Lunch End,Lunch Duration\n"
        
        for entry in timeEntries {
            let clockIn = formatDate(entry.clockInTime)
            let clockOut = entry.clockOutTime.map(formatDate) ?? "Active"
            let duration = entry.formattedDuration ?? "Active"
            let lunchStart = entry.lunchStartTime.map(formatDate) ?? ""
            let lunchEnd = entry.lunchEndTime.map(formatDate) ?? ""
            let lunchDuration = entry.formattedLunchDuration ?? ""
            
            csv += "\(entry.technicianName),\(authManager.currentUser?.username ?? ""),\(entry.customerName),\(clockIn),\(clockOut),\(duration),\(lunchStart),\(lunchEnd),\(lunchDuration)\n"
        }
        
        return csv
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    // Filter entries for current user only
    var userTimeEntries: [TimeEntry] {
        guard let currentUser = authManager.currentUser else { return [] }
        return timeEntries.filter { $0.userId == currentUser.id }
    }
    
    // Filter entries for current day only
    var todayTimeEntries: [TimeEntry] {
        guard let currentUser = authManager.currentUser else { return [] }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        
        return timeEntries.filter { entry in
            entry.userId == currentUser.id &&
            entry.clockInTime >= today &&
            entry.clockInTime < tomorrow
        }
    }
} 