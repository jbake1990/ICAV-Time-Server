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
    @Published var isSyncing = false
    @Published var syncMessage = ""
    
    private let userDefaults = UserDefaults.standard
    private let timeEntriesKey = "TimeEntries"
    private let lastSyncKey = "LastSyncDate"
    private let authManager: AuthManager
    private let apiService = APIService.shared
    
    init(authManager: AuthManager) {
        self.authManager = authManager
        loadData()
        
        // Start periodic sync when user is authenticated
        if authManager.isAuthenticated {
            Task {
                await performSync()
            }
        }
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
        
        var newEntry = TimeEntry(
            userId: currentUser.id,
            technicianName: currentUser.displayName,
            customerName: customerName.trimmingCharacters(in: .whitespacesAndNewlines),
            clockInTime: Date()
        )
        
        // Mark for sync to show active entry in web portal
        if authManager.isOnline {
            newEntry.markForSync()
        }
        
        timeEntries.append(newEntry)
        currentStatus = .clockedIn(newEntry)
        saveData()
        
        // Clear customer name for next entry
        customerName = ""
        
        // Sync immediately to show active entry in web portal
        if authManager.isOnline {
            Task {
                await syncEntry(newEntry)
                // Small delay to prevent race conditions
                try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            }
        }
    }
    
    func clockOut() {
        guard case .clockedIn(let activeEntry) = currentStatus else {
            showAlert("No active time entry to clock out")
            return
        }
        
        if let index = timeEntries.firstIndex(where: { $0.id == activeEntry.id }) {
            timeEntries[index].clockOutTime = Date()
            timeEntries[index].markForSync()
            currentStatus = .clockedOut
            saveData()
            
            // Now sync the complete entry if online
            if authManager.isOnline {
                Task {
                    await syncEntry(timeEntries[index])
                    // Small delay to prevent race conditions
                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                }
            }
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
                timeEntries[index].markForSync()
                currentStatus = .onLunch(timeEntries[index])
                saveData()
                
                // Sync immediately to show lunch start in web portal
                if authManager.isOnline {
                    Task {
                        await syncEntry(timeEntries[index])
                        // Small delay to prevent race conditions
                        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                    }
                }
            }
            
        case .clockedOut:
            // Create a lunch-only entry
            var lunchEntry = TimeEntry(
                userId: currentUser.id,
                technicianName: currentUser.displayName,
                customerName: "Lunch Break",
                clockInTime: Date(),
                lunchStartTime: Date()
            )
            
            // Mark for sync to show active lunch entry in web portal
            if authManager.isOnline {
                lunchEntry.markForSync()
            }
            
            timeEntries.append(lunchEntry)
            currentStatus = .onLunch(lunchEntry)
            saveData()
            
            // Sync immediately to show active lunch entry in web portal
            if authManager.isOnline {
                Task {
                    await syncEntry(lunchEntry)
                }
            }
            
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
            timeEntries[index].markForSync()
            
            // If this was a lunch-only entry, clock out completely
            if timeEntries[index].customerName == "Lunch Break" {
                timeEntries[index].clockOutTime = Date()
                currentStatus = .clockedOut
            } else {
                // Return to active job
                currentStatus = .clockedIn(timeEntries[index])
            }
            
            saveData()
            
            // Sync immediately to show lunch end in web portal
            if authManager.isOnline {
                Task {
                    await syncEntry(timeEntries[index])
                    // Small delay to prevent race conditions
                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                }
            }
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
    
    // MARK: - Sync Methods
    
    func performSync() async {
        guard let token = authManager.getCurrentToken() else {
            return
        }
        
        await MainActor.run {
            self.isSyncing = true
            self.syncMessage = "Syncing data..."
        }
        
        do {
            // First, sync pending local entries to server
            await syncPendingEntries(token: token)
            
            // Then, fetch any new entries from server
            await fetchServerEntries(token: token)
            
            await MainActor.run {
                self.isSyncing = false
                self.syncMessage = "Sync completed"
                self.userDefaults.set(Date(), forKey: self.lastSyncKey)
            }
            
        } catch {
            await MainActor.run {
                self.isSyncing = false
                self.syncMessage = "Sync failed: \(error.localizedDescription)"
            }
        }
    }
    
    private func syncPendingEntries(token: String) async {
        // Sync all pending entries (both complete and incomplete) for real-time visibility
        let pendingEntries = timeEntries.filter { $0.needsSync }
        
        if pendingEntries.isEmpty {
            return
        }
        
        await MainActor.run {
            self.syncMessage = "Uploading \(pendingEntries.count) entries..."
        }
        
        let results = await apiService.submitPendingEntries(pendingEntries, token: token)
        
        await MainActor.run {
            for (index, result) in results.enumerated() {
                let localEntry = pendingEntries[index]
                
                if let entryIndex = self.timeEntries.firstIndex(where: { $0.id == localEntry.id }) {
                    switch result {
                    case .success(let apiEntry):
                        if let serverId = apiEntry.id {
                            self.timeEntries[entryIndex].markAsSynced(serverId: serverId)
                        }
                    case .failure(let error):
                        print("Failed to sync entry \(localEntry.id): \(error)")
                    }
                }
            }
            
            self.saveData()
        }
    }
    
    private func fetchServerEntries(token: String) async {
        do {
            await MainActor.run {
                self.syncMessage = "Downloading server data..."
            }
            
            let apiEntries = try await apiService.fetchTimeEntries(token: token)
            let serverEntries = apiEntries.compactMap { apiService.convertToTimeEntry($0) }
            
            await MainActor.run {
                // Merge server entries with local entries
                self.mergeServerEntries(serverEntries)
                self.saveData()
            }
            
        } catch {
            print("Failed to fetch server entries: \(error)")
        }
    }
    
    private func mergeServerEntries(_ serverEntries: [TimeEntry]) {
        guard let currentUser = authManager.currentUser else { return }
        
        // Filter server entries for current user
        let userServerEntries = serverEntries.filter { $0.userId == currentUser.id }
        
        for serverEntry in userServerEntries {
            // Check if we already have this entry locally
            let existingIndex = timeEntries.firstIndex { localEntry in
                localEntry.serverId == serverEntry.serverId ||
                (abs(localEntry.clockInTime.timeIntervalSince(serverEntry.clockInTime)) < 60 &&
                 localEntry.customerName == serverEntry.customerName)
            }
            
            if let index = existingIndex {
                // Update existing entry with server data if it's newer
                if serverEntry.lastModified > timeEntries[index].lastModified {
                    var updatedEntry = serverEntry
                    updatedEntry.isSynced = true
                    updatedEntry.needsSync = false
                    timeEntries[index] = updatedEntry
                }
            } else {
                // Add new entry from server
                var newEntry = serverEntry
                newEntry.isSynced = true
                newEntry.needsSync = false
                timeEntries.append(newEntry)
            }
        }
    }
    
    private func syncEntry(_ entry: TimeEntry) async {
        guard let token = authManager.getCurrentToken() else {
            return
        }
        
        do {
            print("🔄 Syncing entry: \(entry.id), serverId: \(entry.serverId ?? "nil")")
            let apiEntry = try await apiService.submitTimeEntry(entry, token: token)
            
            await MainActor.run {
                if let index = self.timeEntries.firstIndex(where: { $0.id == entry.id }),
                   let serverId = apiEntry.id {
                    print("✅ Entry synced successfully: \(entry.id) -> serverId: \(serverId)")
                    self.timeEntries[index].markAsSynced(serverId: serverId)
                    self.saveData()
                } else {
                    print("❌ Failed to find entry or get serverId for: \(entry.id)")
                }
            }
        } catch {
            print("❌ Failed to sync entry: \(error)")
        }
    }
    
    // Public method to trigger manual sync
    func triggerSync() {
        guard authManager.isAuthenticated else {
            showAlert("Please log in to sync data")
            return
        }
        
        Task {
            await performSync()
        }
    }
    
    // Get sync status for UI
    var lastSyncDate: Date? {
        return userDefaults.object(forKey: lastSyncKey) as? Date
    }
    
    var pendingSyncCount: Int {
        return timeEntries.filter { $0.needsSync }.count
    }
} 