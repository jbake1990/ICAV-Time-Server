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
                startPeriodicSync()
            }
        }
    }
    
    private func startPeriodicSync() {
        Task {
            while true {
                do {
                    try await Task.sleep(nanoseconds: 5 * 60 * 1_000_000_000) // 5 minutes
                    if authManager.isAuthenticated {
                        print("🔄 Running periodic sync...")
                        await performPeriodicSync()
                    }
                } catch {
                    print("❌ Periodic sync error: \(error)")
                }
            }
        }
    }
    
    private func performPeriodicSync() async {
        // Sync pending entries
        let pendingEntries = timeEntries.filter { $0.needsSync }
        print("🔄 Syncing \(pendingEntries.count) pending entries")
        
        for entry in pendingEntries {
            await syncEntry(entry)
        }
        
        // Refresh data from server
        await performSync()
        
        print("✅ Periodic sync completed")
    }
    
    func clockIn(customerName: String? = nil) {
        guard let currentUser = authManager.currentUser else {
            showAlert("Please log in to use the time tracker")
            return
        }
        
        let customerNameToUse = customerName ?? self.customerName
        
        guard !customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            showAlert("Please enter the customer name")
            return
        }
        
        // Check for existing entry for this customer and user
        let existingEntry = timeEntries.first { entry in
            entry.customerName == customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines) &&
            entry.userId == currentUser.id
        }
        
        if let existingEntry = existingEntry {
            print("📋 Found existing entry for customer: \(existingEntry.id)")
            
            if existingEntry.clockInTime != nil {
                // Entry is already clocked in
                currentStatus = .clockedIn(existingEntry)
                showAlert("Already clocked in for customer: \(customerNameToUse)")
                return
            } else {
                // Entry exists but not clocked in, update it
                if let index = timeEntries.firstIndex(where: { $0.id == existingEntry.id }) {
                    timeEntries[index].clockInTime = Date()
                    
                    // If we were driving, also end the drive time
                    if case .driving = currentStatus {
                        timeEntries[index].driveEndTime = Date()
                        print("🔄 Ending drive time when clocking in")
                    }
                    
                    timeEntries[index].markForSync()
                    currentStatus = .clockedIn(timeEntries[index])
                    saveData()
                    
                    // Force UI update
                    objectWillChange.send()
                    
                    print("🔄 Updated existing entry with clock in time")
                    
                    // Sync immediately to show active entry in web portal
                    if authManager.isOnline {
                        Task {
                            await syncEntry(timeEntries[index])
                            // Small delay to prevent race conditions
                            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                        }
                    }
                    return
                }
            }
        }
        
        // If we were driving, end the drive time and continue the same session
        if case .driving = currentStatus {
            if let drivingEntry = timeEntries.first(where: { $0.isDriving }),
               let index = timeEntries.firstIndex(where: { $0.id == drivingEntry.id }) {
                timeEntries[index].clockInTime = Date() // Set clock in time when transitioning from driving
                timeEntries[index].driveEndTime = Date()
                timeEntries[index].markForSync()
                currentStatus = .clockedIn(timeEntries[index])
                saveData()
                
                // Force UI update
                objectWillChange.send()
                
                // Sync the updated entry
                if authManager.isOnline {
                    Task {
                        await syncEntry(timeEntries[index])
                    }
                }
                return
            }
        }
        
        print("📋 No existing entry found, creating new entry")
        
        // Create new entry for new customer session
        var newEntry = TimeEntry(
            userId: currentUser.id,
            technicianName: currentUser.displayName,
            customerName: customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines),
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
        self.customerName = ""
        
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
            
        case .driving:
            showAlert("Cannot start lunch while driving")
            
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
        print("🗑️ ViewModel: Deleting entry \(entry.customerName) (ID: \(entry.id))")
        print("📊 ViewModel: Before deletion: \(timeEntries.count) entries")
        print("🆔 ViewModel: Entry serverId: \(entry.serverId ?? "nil")")
        
        // Find the entry and mark it for deletion instead of removing it immediately
        if let index = timeEntries.firstIndex(where: { $0.id == entry.id }) {
            timeEntries[index].markForDeletion()
            print("📝 ViewModel: Marked entry for deletion - markedForDeletion: \(timeEntries[index].markedForDeletion), needsSync: \(timeEntries[index].needsSync)")
            
            // If the entry doesn't have a server ID, we need to sync it first to get one
            if timeEntries[index].serverId == nil && !timeEntries[index].isSynced {
                print("⚠️ ViewModel: Entry has no server ID, will sync first to get one")
                timeEntries[index].markForSync() // Mark for sync to get server ID
            }
        } else {
            print("❌ ViewModel: Could not find entry to delete")
        }
        
        // If we're deleting the active entry, update status
        if case .clockedIn(let activeEntry) = currentStatus, activeEntry.id == entry.id {
            currentStatus = .clockedOut
            print("🔄 ViewModel: Updated status to clockedOut (deleted active entry)")
        } else if case .onLunch(let lunchEntry) = currentStatus, lunchEntry.id == entry.id {
            currentStatus = .clockedOut
            print("🔄 ViewModel: Updated status to clockedOut (deleted lunch entry)")
        }
        
        saveData()
        
        // Force UI update
        objectWillChange.send()
        
        print("💾 ViewModel: Data saved after deletion")
        print("📊 ViewModel: After marking for deletion: \(timeEntries.filter { $0.markedForDeletion }.count) entries marked for deletion")
        
        // Automatically trigger sync to delete from server
        if authManager.isOnline {
            Task {
                print("🔄 Auto-syncing after deletion")
                await performSync()
            }
        } else {
            print("⚠️ Not online, will sync when connection is restored")
        }
    }
    
    private func saveData() {
        // Save time entries
        if let encoded = try? JSONEncoder().encode(timeEntries) {
            userDefaults.set(encoded, forKey: timeEntriesKey)
            print("💾 Data saved: \(timeEntries.count) entries, \(timeEntries.filter { $0.needsSync }.count) pending")
        } else {
            print("❌ Failed to encode time entries for saving")
        }
    }
    
    private func loadData() {
        // Load time entries
        if let data = userDefaults.data(forKey: timeEntriesKey),
           let decoded = try? JSONDecoder().decode([TimeEntry].self, from: data) {
            timeEntries = decoded
            print("📱 Data loaded: \(timeEntries.count) entries, \(timeEntries.filter { $0.needsSync }.count) pending")
        } else {
            print("📱 No saved data found or failed to decode")
        }
        
        // Check for active entry for current user
        if let currentUser = authManager.currentUser {
            if let activeEntry = timeEntries.first(where: { $0.isActive && $0.userId == currentUser.id }) {
                if activeEntry.isOnLunch {
                    currentStatus = .onLunch(activeEntry)
                } else if activeEntry.isDriving {
                    currentStatus = .driving
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
        var csv = "Technician,Username,Customer,Clock In,Clock Out,Duration,Drive Start,Drive End,Drive Duration,Lunch Start,Lunch End,Lunch Duration\n"
        
        for entry in timeEntries {
            let clockIn = entry.clockInTime.map(formatDate) ?? "N/A"
            let clockOut = entry.clockOutTime.map(formatDate) ?? "Active"
            let duration = entry.formattedDuration ?? "Active"
            let driveStart = entry.driveStartTime.map(formatDate) ?? ""
            let driveEnd = entry.driveEndTime.map(formatDate) ?? ""
            let driveDuration = entry.formattedDriveDuration ?? ""
            let lunchStart = entry.lunchStartTime.map(formatDate) ?? ""
            let lunchEnd = entry.lunchEndTime.map(formatDate) ?? ""
            let lunchDuration = entry.formattedLunchDuration ?? ""
            
            csv += "\(entry.technicianName),\(authManager.currentUser?.username ?? ""),\(entry.customerName),\(clockIn),\(clockOut),\(duration),\(driveStart),\(driveEnd),\(driveDuration),\(lunchStart),\(lunchEnd),\(lunchDuration)\n"
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
    
    // Filter entries for last 2 days only
    var todayTimeEntries: [TimeEntry] {
        guard let currentUser = authManager.currentUser else { return [] }
        
        return timeEntries.filter { entry in
            entry.userId == currentUser.id &&
            !entry.markedForDeletion &&
            isWithinTwoDays(entry)
        }
    }
    
    // MARK: - Computed Properties
    var activeEntries: [TimeEntry] {
        return timeEntries.filter { $0.isActive && isWithinTwoDays($0) }
    }
    
    var completedEntries: [TimeEntry] {
        return timeEntries.filter { !$0.isActive && isWithinTwoDays($0) }
    }
    
    var pendingEntries: [TimeEntry] {
        return timeEntries.filter { $0.needsSync && isWithinTwoDays($0) }
    }
    
    // Filter entries to only show those from the last 2 days
    private func isWithinTwoDays(_ entry: TimeEntry) -> Bool {
        let twoDaysAgo = Date().addingTimeInterval(-2 * 24 * 60 * 60) // 2 days ago
        let entryTime = entry.clockInTime ?? entry.lastModified
        return entryTime >= twoDaysAgo
    }
    
    // MARK: - Sync Methods
    
    func performSync() async {
        guard let token = authManager.getCurrentToken() else {
            print("❌ No auth token available for sync")
            return
        }
        print("🔄 Starting sync process")
        print("🔑 Token available: \(!token.isEmpty)")
        await MainActor.run {
            self.isSyncing = true
            self.syncMessage = "Syncing data..."
        }
        // First, sync pending local entries to server
        print("📤 Syncing pending entries to server...")
        await syncPendingEntries(token: token)
        // Then, fetch any new entries from server
        print("📥 Fetching entries from server...")
        await fetchServerEntries(token: token)
        // After fetching, filter to only today's entries
        await MainActor.run {
            self.filterToToday()
            self.isSyncing = false
            self.syncMessage = "Sync completed"
            self.userDefaults.set(Date(), forKey: self.lastSyncKey)
            print("✅ Sync completed")
        }
    }

    private func fetchServerEntries(token: String) async {
        do {
            await MainActor.run {
                self.syncMessage = "Downloading server data..."
            }
            let apiEntries = try await apiService.fetchTimeEntries(token: token)
            let serverEntries = apiEntries.compactMap { apiService.convertToTimeEntry($0) }
            print("[DEBUG] Fetched \(serverEntries.count) entries from server:")
            for entry in serverEntries {
                print("[DEBUG] Server entry: id=\(entry.id), userId=\(entry.userId), customer=\(entry.customerName), clockIn=\(String(describing: entry.clockInTime)), driveStart=\(String(describing: entry.driveStartTime))")
            }
            await MainActor.run {
                // Merge server entries with local entries
                self.mergeServerEntries(serverEntries)
                self.saveData()
                print("[DEBUG] After merge, local timeEntries count: \(self.timeEntries.count)")
                for entry in self.timeEntries {
                    print("[DEBUG] Local entry: id=\(entry.id), userId=\(entry.userId), customer=\(entry.customerName), clockIn=\(String(describing: entry.clockInTime)), driveStart=\(String(describing: entry.driveStartTime))")
                }
                // After merging, filter to only today's entries
                self.filterToToday()
            }
        } catch {
            print("Failed to fetch server entries: \(error)")
        }
    }

    // Helper to filter timeEntries to only entries from the last 2 days for the current user
    private func filterToToday() {
        guard let currentUser = authManager.currentUser else { return }
        self.timeEntries = self.timeEntries.filter { entry in
            entry.userId == currentUser.id &&
            !entry.markedForDeletion &&
            isWithinTwoDays(entry)
        }
        print("[DEBUG] After filterToTwoDays, timeEntries count: \(self.timeEntries.count)")
        for entry in self.timeEntries {
            print("[DEBUG] Two-day entry: id=\(entry.id), userId=\(entry.userId), customer=\(entry.customerName), clockIn=\(String(describing: entry.clockInTime)), driveStart=\(String(describing: entry.driveStartTime))")
        }
    }
    
    private func syncPendingEntries(token: String) async {
        print("🔄 Sync: Starting sync process")
        print("📊 Sync: Total entries: \(timeEntries.count)")
        
        // Handle deletions first
        let entriesToDelete = timeEntries.filter { $0.markedForDeletion }
        print("🗑️ Sync: Found \(entriesToDelete.count) entries marked for deletion")
        
        if !entriesToDelete.isEmpty {
            await MainActor.run {
                self.syncMessage = "Deleting \(entriesToDelete.count) entries..."
            }
            
            for entry in entriesToDelete {
                print("🗑️ Sync: Attempting to delete entry \(entry.customerName) (ID: \(entry.id), ServerID: \(entry.serverId ?? "nil"))")
                
                // If entry doesn't have server ID, sync it first to get one
                if entry.serverId == nil {
                    print("⚠️ Sync: Entry has no server ID, syncing first to get one")
                    do {
                        let apiEntry = try await apiService.submitTimeEntry(entry, token: token)
                        if let serverId = apiEntry.id {
                            // Update the entry with the server ID
                            if let index = timeEntries.firstIndex(where: { $0.id == entry.id }) {
                                timeEntries[index].markAsSynced(serverId: serverId)
                                print("✅ Sync: Got server ID for entry: \(serverId)")
                            }
                        }
                    } catch {
                        print("❌ Sync: Failed to sync entry to get server ID: \(error)")
                        continue // Skip deletion if we can't get server ID
                    }
                }
                
                do {
                    try await apiService.deleteTimeEntry(entry, token: token)
                    print("✅ Sync: Successfully deleted entry \(entry.customerName) from server")
                    // Remove from local array after successful server deletion
                    await MainActor.run {
                        self.timeEntries.removeAll { $0.id == entry.id }
                        print("🗑️ Sync: Removed entry \(entry.customerName) from local storage")
                    }
                } catch {
                    print("❌ Sync: Failed to delete entry \(entry.customerName) from server: \(error)")
                    // Even if server deletion fails, remove from local UI since user marked it for deletion
                    await MainActor.run {
                        self.timeEntries.removeAll { $0.id == entry.id }
                        print("🗑️ Sync: Removed entry \(entry.customerName) from local storage despite server error")
                    }
                }
            }
        }
        
        // Sync all pending entries (both complete and incomplete) for real-time visibility
        let pendingEntries = timeEntries.filter { $0.needsSync && !$0.markedForDeletion }
        
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
    
    private func mergeServerEntries(_ serverEntries: [TimeEntry]) {
        guard let currentUser = authManager.currentUser else { return }
        // Filter server entries for current user
        let userServerEntries = serverEntries.filter { $0.userId == currentUser.id }
        for serverEntry in userServerEntries {
            // Try to find a matching local entry by serverId or close clockInTime/driveStartTime and customerName
            let existingIndex = timeEntries.firstIndex { localEntry in
                (localEntry.serverId != nil && serverEntry.serverId != nil && localEntry.serverId == serverEntry.serverId) ||
                (
                    localEntry.customerName == serverEntry.customerName &&
                    (
                        (localEntry.clockInTime != nil && serverEntry.clockInTime != nil && abs(localEntry.clockInTime!.timeIntervalSince(serverEntry.clockInTime!)) < 60) ||
                        (localEntry.driveStartTime != nil && serverEntry.driveStartTime != nil && abs(localEntry.driveStartTime!.timeIntervalSince(serverEntry.driveStartTime!)) < 60)
                    )
                )
            }
            if let index = existingIndex {
                // Don't update if the local entry is marked for deletion
                if timeEntries[index].markedForDeletion {
                    print("🗑️ Merge: Skipping server entry for \(serverEntry.customerName) - local entry marked for deletion")
                    continue
                }
                
                // Update existing entry with server data if it's newer
                if serverEntry.lastModified > timeEntries[index].lastModified {
                    var updatedEntry = serverEntry
                    updatedEntry.isSynced = true
                    updatedEntry.needsSync = false
                    timeEntries[index] = updatedEntry
                }
            } else {
                // Add new entry from server (but check if we have a local entry marked for deletion with same customer)
                let localDeletedEntry = timeEntries.first { localEntry in
                    localEntry.markedForDeletion && localEntry.customerName == serverEntry.customerName
                }
                
                if localDeletedEntry != nil {
                    print("🗑️ Merge: Skipping server entry for \(serverEntry.customerName) - local entry marked for deletion")
                    continue
                }
                
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
                    print("📝 Before update - Entry \(index): needsSync=\(self.timeEntries[index].needsSync), serverId=\(self.timeEntries[index].serverId ?? "nil")")
                    
                    self.timeEntries[index].markAsSynced(serverId: serverId)
                    
                    print("📝 After update - Entry \(index): needsSync=\(self.timeEntries[index].needsSync), serverId=\(self.timeEntries[index].serverId ?? "nil")")
                    print("📊 Total entries: \(self.timeEntries.count), Pending: \(self.timeEntries.filter { $0.needsSync }.count)")
                    
                    self.saveData()
                } else {
                    print("❌ Failed to find entry or get serverId for: \(entry.id)")
                    print("🔍 Available entries: \(self.timeEntries.map { "\($0.id): needsSync=\($0.needsSync)" })")
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
        
        print("🔄 Manual sync triggered")
        print("🔐 User authenticated: \(authManager.isAuthenticated)")
        print("🌐 Online status: \(authManager.isOnline)")
        print("📊 Total entries: \(timeEntries.count)")
        print("📤 Pending sync count: \(timeEntries.filter { $0.needsSync }.count)")
        
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
    
    func createJob(customerName: String) {
        guard let currentUser = authManager.currentUser else {
            showAlert("Please log in to use the time tracker")
            return
        }
        
        let customerNameToUse = customerName.trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard !customerNameToUse.isEmpty else {
            showAlert("Please enter the customer name")
            return
        }
        
        print("📋 Creating new job for customer: \(customerNameToUse)")
        print("🔐 User authenticated: \(authManager.isAuthenticated)")
        print("🌐 Online status: \(authManager.isOnline)")
        
        // Check if there's already an entry for this customer and user
        let existingEntry = timeEntries.first { entry in
            entry.customerName == customerNameToUse &&
            entry.userId == currentUser.id
        }
        
        if let existingEntry = existingEntry {
            print("📋 Found existing entry for customer: \(existingEntry.id)")
            showAlert("Job already exists for customer: \(customerNameToUse)")
            return
        }
        
        print("📋 No existing entry found, creating new job entry")
        
        var newJobEntry = TimeEntry(
            userId: currentUser.id,
            technicianName: currentUser.displayName,
            customerName: customerNameToUse
        )
        
        // Mark for sync to show the job in web portal
        if authManager.isOnline {
            newJobEntry.markForSync()
            print("📤 Entry marked for sync: \(newJobEntry.id)")
        } else {
            print("⚠️ Not online, entry not marked for sync")
        }
        
        timeEntries.append(newJobEntry)
        saveData()
        
        print("💾 Data saved locally. Total entries: \(timeEntries.count)")
        print("📊 Pending sync count: \(timeEntries.filter { $0.needsSync }.count)")
        
        // Sync immediately to show the job in web portal
        if authManager.isOnline {
            Task {
                print("🔄 Starting immediate sync for new job")
                await syncEntry(newJobEntry)
            }
        } else {
            print("⚠️ Not online, skipping immediate sync")
        }
    }
    
    func startDriving(customerName: String? = nil) {
        guard let currentUser = authManager.currentUser else {
            showAlert("Please log in to use the time tracker")
            return
        }
        
        let customerNameToUse = customerName ?? self.customerName
        
        guard !customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            showAlert("Please enter the customer name")
            return
        }
        
        print("🚗 Starting driving for customer: \(customerNameToUse)")
        print("🔐 User authenticated: \(authManager.isAuthenticated)")
        print("🌐 Online status: \(authManager.isOnline)")
        
        // Check if there's already an entry for this customer and user
        let existingEntry = timeEntries.first { entry in
            entry.customerName == customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines) &&
            entry.userId == currentUser.id
        }
        
        if let existingEntry = existingEntry {
            print("📋 Found existing entry for customer: \(existingEntry.id)")
            
            if existingEntry.driveStartTime != nil && existingEntry.driveEndTime == nil {
                // Already driving for this customer
                showAlert("Already driving for customer: \(customerNameToUse)")
                return
            } else {
                // Entry exists but not driving, update it
                if let index = timeEntries.firstIndex(where: { $0.id == existingEntry.id }) {
                    timeEntries[index].driveStartTime = Date()
                    timeEntries[index].markForSync()
                    currentStatus = .driving
                    saveData()
                    
                    // Force UI update
                    objectWillChange.send()
                    
                    print("🔄 Updated existing entry with drive start time")
                    
                    // Sync immediately to show active driving entry in web portal
                    if authManager.isOnline {
                        Task {
                            print("🔄 Starting immediate sync for updated driving entry")
                            await syncEntry(timeEntries[index])
                        }
                    }
                    return
                }
            }
        }
        
        print("📋 No existing entry found, creating new driving entry")
        
        var drivingEntry = TimeEntry(
            userId: currentUser.id,
            technicianName: currentUser.displayName,
            customerName: customerNameToUse.trimmingCharacters(in: .whitespacesAndNewlines),
            driveStartTime: Date()
        )
        
        // Mark for sync to show active driving entry in web portal
        if authManager.isOnline {
            drivingEntry.markForSync()
            print("📤 Entry marked for sync: \(drivingEntry.id)")
        } else {
            print("⚠️ Not online, entry not marked for sync")
        }
        
        timeEntries.append(drivingEntry)
        currentStatus = .driving
        saveData()
        
        print("💾 Data saved locally. Total entries: \(timeEntries.count)")
        print("📊 Pending sync count: \(timeEntries.filter { $0.needsSync }.count)")
        
        // Sync immediately to show active driving entry in web portal
        if authManager.isOnline {
            Task {
                print("🔄 Starting immediate sync for driving entry")
                await syncEntry(drivingEntry)
            }
        } else {
            print("⚠️ Not online, skipping immediate sync")
        }
    }
    
    func endDriving() {
        guard case .driving = currentStatus else {
            showAlert("No active driving session to end")
            return
        }
        
        if let drivingEntry = timeEntries.first(where: { $0.isDriving }),
           let index = timeEntries.firstIndex(where: { $0.id == drivingEntry.id }) {
            timeEntries[index].driveEndTime = Date()
            timeEntries[index].markForSync()
            currentStatus = .clockedOut
            saveData()
            
            // Sync immediately to show driving end in web portal
            if authManager.isOnline {
                Task {
                    await syncEntry(timeEntries[index])
                }
            }
        }
    }
} 