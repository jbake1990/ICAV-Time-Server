//
//  ContentView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct ContentView: View {
    enum ButtonState { case unavailable, available, active }
    @StateObject private var authManager = AuthManager()
    @StateObject private var viewModel: TimeTrackerViewModel
    @State private var showingExportSheet = false
    // Add these:
    @State private var selectedJob: TimeEntry? = nil
    // For new job prompt
    @State private var showingNewJobAlert = false
    @State private var newJobName = ""
    @State private var showingEditSheet = false
    @State private var editJob: TimeEntry? = nil
    @State private var showingLogoutAlert = false
    
    // Computed property for jobs list (today's entries, most recent first)
    private var jobs: [TimeEntry] {
        viewModel.todayTimeEntries.sorted {
            let a = $0.clockInTime ?? $0.driveStartTime ?? Date.distantPast
            let b = $1.clockInTime ?? $1.driveStartTime ?? Date.distantPast
            return a > b // Most recent first
        }
    }
    
    init() {
        let auth = AuthManager()
        self._authManager = StateObject(wrappedValue: auth)
        self._viewModel = StateObject(wrappedValue: TimeTrackerViewModel(authManager: auth))
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                mainTimeTrackerView
                    .onAppear {
                        // Only set selectedJob if not already set
                        if selectedJob == nil, let first = jobs.first {
                            selectedJob = first
                        } else {
                            // Try to preserve selection after sync/filter
                            selectedJob = findMatchingJob(in: jobs, for: selectedJob)
                        }
                    }
                    .sheet(isPresented: $showingNewJobAlert) {
                        NavigationView {
                            VStack(spacing: 20) {
                                Text("New Job")
                                    .font(.title)
                                    .fontWeight(.bold)
                                
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Customer Name")
                                        .font(.headline)
                                    TextField("Enter customer name", text: $newJobName)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                }
                                
                                Spacer()
                            }
                            .padding()
                            .navigationBarTitleDisplayMode(.inline)
                            .navigationBarItems(
                                leading: Button("Cancel") {
                                    newJobName = ""
                                    showingNewJobAlert = false
                                },
                                trailing: Button("Add") {
                                    if !newJobName.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).isEmpty {
                                        print("Adding new job: \(newJobName)")
                                        viewModel.createJob(customerName: newJobName)
                                        
                                        // Find the newly created job to select it
                                        if let newJob = viewModel.timeEntries.first(where: { 
                                            $0.customerName == newJobName.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines) &&
                                            $0.userId == authManager.currentUser?.id
                                        }) {
                                            selectedJob = newJob
                                        }
                                        
                                        newJobName = ""
                                        showingNewJobAlert = false
                                        print("New job added, total jobs: \(viewModel.timeEntries.count)")
                                    }
                                }
                                .disabled(newJobName.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).isEmpty)
                            )
                        }
                    }
            } else {
                LoginView(authManager: authManager)
            }
        }
    }
    
    private var mainTimeTrackerView: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("ICAV Time Tracker")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Spacer()
                userInfoButton
            }
            .padding([.top, .horizontal])

            // Online Status and Manual Sync Button
            HStack {
                Spacer()
                Button(action: { viewModel.triggerSync() }) {
                    HStack(spacing: 4) {
                        Image(systemName: authManager.isOnline ? "wifi" : "wifi.slash")
                            .foregroundColor(authManager.isOnline ? .green : .orange)
                            .font(.caption)
                        
                        Text(authManager.isOnline ? "Online" : "Offline")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        if viewModel.pendingSyncCount > 0 {
                            Text("(\(viewModel.pendingSyncCount) pending)")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        } else if viewModel.lastSyncDate != nil {
                            Text("(Synced)")
                                .font(.caption2)
                                .foregroundColor(.green)
                        }
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 8)


            
            // Selected Job
            VStack(alignment: .leading, spacing: 4) {
                Text("Selected Job")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(selectedJob?.customerName ?? "None")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            // Action Buttons Grid (restyled)
            let states = buttonStates(for: selectedJob)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 18) {
                actionButton(
                    title: "Clock In",
                    icon: "arrow.up.circle",
                    state: states["Clock In"] ?? .unavailable,
                    brightColor: .blue,
                    darkColor: Color(.sRGB, red: 0.08, green: 0.13, blue: 0.22, opacity: 1)
                )
                actionButton(
                    title: "Clock Out",
                    icon: "arrow.down.circle",
                    state: states["Clock Out"] ?? .unavailable,
                    brightColor: .red,
                    darkColor: Color(.sRGB, red: 0.13, green: 0.13, blue: 0.15, opacity: 1)
                )
                actionButton(
                    title: "Start Lunch",
                    icon: "fork.knife",
                    state: states["Start Lunch"] ?? .unavailable,
                    brightColor: .orange,
                    darkColor: Color(.sRGB, red: 0.22, green: 0.13, blue: 0.08, opacity: 1)
                )
                actionButton(
                    title: "End Lunch",
                    icon: "fork.knife.circle",
                    state: states["End Lunch"] ?? .unavailable,
                    brightColor: .orange,
                    darkColor: Color(.sRGB, red: 0.13, green: 0.13, blue: 0.15, opacity: 1)
                )
                actionButton(
                    title: "Start Driving",
                    icon: "car",
                    state: states["Start Driving"] ?? .unavailable,
                    brightColor: .green,
                    darkColor: Color(.sRGB, red: 0.08, green: 0.22, blue: 0.13, opacity: 1)
                )
                actionButton(
                    title: "End Driving",
                    icon: "car.fill",
                    state: states["End Driving"] ?? .unavailable,
                    brightColor: .green,
                    darkColor: Color(.sRGB, red: 0.13, green: 0.13, blue: 0.15, opacity: 1)
                )
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            // Edit Timestamps Button
            Button(action: {
                if let job = selectedJob {
                    print("📝 Opening edit sheet for job: \(job.customerName)")
                    editJob = job
                    showingEditSheet = true
                    print("📝 Edit sheet should now be visible")
                } else {
                    print("❌ No selected job to edit")
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: "pencil.and.list.clipboard")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.purple)
                    Text("Edit Timestamps")
                        .font(.headline)
                        .foregroundColor(.purple)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.purple.opacity(0.2))
                .cornerRadius(16)
                .shadow(color: Color.purple.opacity(0.08), radius: 6, x: 0, y: 2)
            }
            .sheet(isPresented: $showingEditSheet) {
                if let job = editJob {
                    EditTimestampsSheet(job: job, onSave: { updatedJob in
                        var newJob = updatedJob
                        newJob.markForSync()
                        if let idx = viewModel.timeEntries.firstIndex(where: { $0.id == newJob.id }) {
                            viewModel.timeEntries[idx] = newJob
                        }
                        selectedJob = newJob
                        showingEditSheet = false
                        viewModel.triggerSync()
                    }, onDelete: { jobToDelete in
                        print("🗑️ Deleting job: \(jobToDelete.customerName) (ID: \(jobToDelete.id))")
                        print("📊 Before deletion: \(viewModel.timeEntries.count) entries")
                        
                        // Use the view model's deleteEntry method
                        viewModel.deleteEntry(jobToDelete)
                        
                        print("📊 After deletion: \(viewModel.timeEntries.count) entries")
                        
                        // Update selected job if it was the deleted one
                        if selectedJob?.id == jobToDelete.id {
                            selectedJob = viewModel.timeEntries.first
                            print("🔄 Updated selected job to: \(selectedJob?.customerName ?? "None")")
                        }
                        
                        showingEditSheet = false
                        print("✅ Deletion completed")
                    })
                } else {
                    Text("No job selected for editing")
                        .navigationBarItems(trailing: Button("Done") {
                            showingEditSheet = false
                        })
                }
            }
            .alert("Time Tracker", isPresented: $viewModel.showingAlert) {
                Button("OK") { }
            } message: {
                Text(viewModel.alertMessage)
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            // Jobs List with New Job button
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Jobs")
                        .font(.headline)
                    Spacer()
                    Button(action: { 
                        print("New Job button tapped")
                        showingNewJobAlert = true 
                    }) {
                        Image(systemName: "plus.circle")
                        Text("New Job")
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
                .padding(.horizontal)
                List(jobs) { job in
                    HStack {
                        Text(job.customerName)
                        Spacer()
                        if selectedJob?.id == job.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedJob = job
                    }
                }
                .listStyle(PlainListStyle())
            }
            .frame(maxHeight: 250)
        }
    }
    
    private func handleAction(_ action: String) {
        switch action {
        case "Clock In":
            if let selectedJob = selectedJob {
                viewModel.clockIn(customerName: selectedJob.customerName)
            } else {
                viewModel.clockIn()
            }
        case "Clock Out":
            viewModel.clockOut()
        case "Start Break":
            viewModel.startLunch() // Reuse startLunch for break functionality
        case "End Break":
            viewModel.endLunch() // Reuse endLunch for break functionality
        case "Start Driving":
            if let selectedJob = selectedJob {
                viewModel.startDriving(customerName: selectedJob.customerName)
            } else {
                // Cannot start driving without a selected job
                break
            }
        case "End Driving":
            viewModel.endDriving()
        default:
            break
        }
        
        // Update selected job to reflect the current status
        if case .clockedIn(let activeEntry) = viewModel.currentStatus {
            selectedJob = activeEntry
        } else if case .onLunch(let lunchEntry) = viewModel.currentStatus {
            selectedJob = lunchEntry
        } else {
            // If no active entry, try to find the most recent job
            selectedJob = jobs.first
        }
        
        // Also update selectedJob to the latest version from the ViewModel
        if let currentSelectedJob = selectedJob {
            if let updatedJob = viewModel.timeEntries.first(where: { $0.id == currentSelectedJob.id }) {
                selectedJob = updatedJob
            }
        }
    }
    
    // Helper for styled action buttons
    private func actionButton(title: String, icon: String, state: ButtonState, brightColor: Color, darkColor: Color) -> some View {
        let bgColor: Color
        let fgColor: Color
        switch state {
        case .unavailable:
            bgColor = Color(.systemGray5)
            fgColor = .gray
        case .available:
            bgColor = darkColor
            fgColor = brightColor
        case .active:
            bgColor = brightColor
            fgColor = .white
        }
        return Button(action: { handleAction(title) }) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(fgColor)
                Text(title)
                    .font(.headline)
                    .foregroundColor(fgColor)
            }
            .frame(maxWidth: .infinity, minHeight: 70)
            .padding()
            .background(bgColor)
            .cornerRadius(16)
            .shadow(color: state == .active ? brightColor.opacity(0.2) : .clear, radius: 6, x: 0, y: 2)
        }
        .disabled(state == .unavailable)
    }
    
    // Helper to determine button state for each action
    private func buttonStates(for job: TimeEntry?) -> [String: ButtonState] {
        // If no job is selected, all buttons are unavailable
        guard let selectedJob = job else {
            return [
                "Clock In": .unavailable,
                "Clock Out": .unavailable,
                "Start Break": .unavailable,
                "End Break": .unavailable,
                "Start Driving": .unavailable,
                "End Driving": .unavailable
            ]
        }
        
        let isClockedIn = selectedJob.clockInTime != nil && selectedJob.clockOutTime == nil && !selectedJob.isOnLunch && !selectedJob.isDriving
        let isOnLunch = selectedJob.isOnLunch
        let isDriving = selectedJob.isDriving
        let isClockedOut = (selectedJob.clockInTime == nil && selectedJob.driveStartTime == nil) || selectedJob.clockOutTime != nil
        
        // If the selected job is on lunch, show lunch end
        if isOnLunch {
            return [
                "Clock In": .unavailable,
                "Clock Out": .unavailable,
                "Start Lunch": .unavailable,
                "End Lunch": .active,
                "Start Driving": .unavailable,
                "End Driving": .unavailable
            ]
        }
        
        // If the selected job is driving, show driving options
        if isDriving {
            return [
                "Clock In": .available, // Clock In while driving ends drive and starts job
                "Clock Out": .unavailable,
                "Start Lunch": .unavailable,
                "End Lunch": .unavailable,
                "Start Driving": .active,
                "End Driving": .available
            ]
        }
        
        // If the selected job is clocked in (not on lunch/driving)
        if isClockedIn {
            return [
                "Clock In": .unavailable, // Can't clock in if already clocked in
                "Clock Out": .available,
                "Start Lunch": .available,
                "End Lunch": .unavailable,
                "Start Driving": .unavailable,
                "End Driving": .unavailable
            ]
        }
        
        // If the selected job is clocked out (new job or completed job)
        if isClockedOut {
            let hasCustomerName = !selectedJob.customerName.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines).isEmpty
            return [
                "Clock In": hasCustomerName ? .available : .unavailable,
                "Clock Out": .unavailable,
                "Start Lunch": .available, // Can start lunch when clocked out (creates "Lunch Break" entry)
                "End Lunch": .unavailable,
                "Start Driving": hasCustomerName ? .available : .unavailable,
                "End Driving": .unavailable
            ]
        }
        
        // Default fallback - all unavailable
        return [
            "Clock In": .unavailable,
            "Clock Out": .unavailable,
            "Start Lunch": .unavailable,
            "End Lunch": .unavailable,
            "Start Driving": .unavailable,
            "End Driving": .unavailable
        ]
    }
    
    private func findMatchingJob(in jobs: [TimeEntry], for job: TimeEntry?) -> TimeEntry? {
        guard let job = job else { return nil }
        // Prefer serverId if present, else fallback to id
        if let serverId = job.serverId {
            return jobs.first(where: { $0.serverId == serverId })
        } else {
            return jobs.first(where: { $0.id == job.id })
        }
    }
    
    private var userInfoButton: some View {
        Menu {
            if let user = authManager.currentUser {
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.displayName)
                        .font(.headline)
                    Text("@\(user.username)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
            }
            
            Divider()
            
            Button("Logout") {
                authManager.logout()
            }
            .foregroundColor(.red)
        } label: {
            Image(systemName: "person.circle")
                .font(.title2)
        }
    }
    
    private var statusHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 12, height: 12)
                
                Text(statusText)
                    .font(.headline)
                    .foregroundColor(statusColor)
                
                Spacer()
                
                // Sync status indicator
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: authManager.isOnline ? "wifi" : "wifi.slash")
                            .foregroundColor(authManager.isOnline ? .green : .orange)
                            .font(.caption)
                        
                        Text(authManager.isOnline ? "Online" : "Offline")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    if viewModel.pendingSyncCount > 0 {
                        Text("\(viewModel.pendingSyncCount) pending")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    } else if viewModel.lastSyncDate != nil {
                        Text("Synced")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                }
            }
            
            if case .clockedIn(let entry) = viewModel.currentStatus {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Currently working for: \(entry.customerName)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    if let clockInTime = entry.clockInTime {
                        Text("Started at: \(formatDate(clockInTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else if case .onLunch(let entry) = viewModel.currentStatus {
                VStack(alignment: .leading, spacing: 4) {
                    if entry.customerName == "Lunch Break" {
                        Text("On lunch break")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("On lunch break from: \(entry.customerName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    if let lunchStart = entry.lunchStartTime {
                        Text("Lunch started at: \(formatDate(lunchStart))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else if case .driving = viewModel.currentStatus {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Currently driving to: \(selectedJob?.customerName ?? "Unknown")")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text("Drive started at: \(formatDate(Date()))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }
    

    
    private var statusColor: Color {
        switch viewModel.currentStatus {
        case .clockedOut:
            return .gray
        case .clockedIn:
            return .green
        case .onLunch:
            return .orange
        case .driving:
            return .blue
        }
    }
    
    private var statusText: String {
        switch viewModel.currentStatus {
        case .clockedOut:
            return "Ready to Clock In"
        case .clockedIn:
            return "Currently Clocked In"
        case .onLunch:
            return "On Lunch Break"
        case .driving:
            return "Driving"
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

extension ClockStatus {
    var isActive: Bool {
        switch self {
        case .clockedOut:
            return false
        case .clockedIn:
            return true
        case .onLunch:
            return true
        case .driving:
            return true
        }
    }
    
    var isOnLunch: Bool {
        switch self {
        case .clockedOut:
            return false
        case .clockedIn:
            return false
        case .onLunch:
            return true
        case .driving:
            return false
        }
    }
}

#Preview {
    ContentView()
}

struct EditTimestampsSheet: View {
    var job: TimeEntry
    var onSave: (TimeEntry) -> Void
    var onDelete: (TimeEntry) -> Void
    @State private var clockInTime: Date
    @State private var clockOutTime: Date
    @State private var lunchStartTime: Date
    @State private var lunchEndTime: Date
    @State private var driveStartTime: Date
    @State private var driveEndTime: Date
    @State private var showingDeleteAlert = false
    
    init(job: TimeEntry, onSave: @escaping (TimeEntry) -> Void, onDelete: @escaping (TimeEntry) -> Void) {
        print("📝 EditTimestampsSheet init called for job: \(job.customerName)")
        self.job = job
        self.onSave = onSave
        self.onDelete = onDelete
        
        // Use job values or default to now, but ensure we have valid dates
        let now = Date()
        _clockInTime = State(initialValue: job.clockInTime ?? now)
        _clockOutTime = State(initialValue: job.clockOutTime ?? now)
        _lunchStartTime = State(initialValue: job.lunchStartTime ?? now)
        _lunchEndTime = State(initialValue: job.lunchEndTime ?? now)
        _driveStartTime = State(initialValue: job.driveStartTime ?? now)
        _driveEndTime = State(initialValue: job.driveEndTime ?? now)
        print("📝 EditTimestampsSheet init completed")
    }
    var body: some View {
        NavigationView {
            Form {
                // Only show Clock In/Out section if there are clock times
                if job.clockInTime != nil || job.clockOutTime != nil {
                    Section(header: Text("Clock In/Out")) {
                        if job.clockInTime != nil {
                            DatePicker("Clock In", selection: $clockInTime, displayedComponents: [.date, .hourAndMinute])
                        }
                        if job.clockOutTime != nil {
                            DatePicker("Clock Out", selection: $clockOutTime, displayedComponents: [.date, .hourAndMinute])
                        }
                    }
                }
                
                // Only show Lunch section if there are lunch times
                if job.lunchStartTime != nil || job.lunchEndTime != nil {
                    Section(header: Text("Lunch")) {
                        if job.lunchStartTime != nil {
                            DatePicker("Lunch Start", selection: $lunchStartTime, displayedComponents: [.date, .hourAndMinute])
                        }
                        if job.lunchEndTime != nil {
                            DatePicker("Lunch End", selection: $lunchEndTime, displayedComponents: [.date, .hourAndMinute])
                        }
                    }
                }
                
                // Only show Drive section if there are drive times
                if job.driveStartTime != nil || job.driveEndTime != nil {
                    Section(header: Text("Drive")) {
                        if job.driveStartTime != nil {
                            DatePicker("Drive Start", selection: $driveStartTime, displayedComponents: [.date, .hourAndMinute])
                        }
                        if job.driveEndTime != nil {
                            DatePicker("Drive End", selection: $driveEndTime, displayedComponents: [.date, .hourAndMinute])
                        }
                    }
                }
                
                // Delete section always available
                Section {
                    Button(action: {
                        showingDeleteAlert = true
                    }) {
                        HStack {
                            Image(systemName: "trash")
                                .foregroundColor(.red)
                            Text("Delete Entry")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            .navigationBarTitle("Edit Timestamps", displayMode: .inline)
            .navigationBarItems(
                leading: Button("Cancel") { onSave(job) },
                trailing: Button("Save") {
                    var updated = job
                    // Only update times that existed in the original job
                    if job.clockInTime != nil {
                        updated.clockInTime = clockInTime
                    }
                    if job.clockOutTime != nil {
                        updated.clockOutTime = clockOutTime
                    }
                    if job.lunchStartTime != nil {
                        updated.lunchStartTime = lunchStartTime
                    }
                    if job.lunchEndTime != nil {
                        updated.lunchEndTime = lunchEndTime
                    }
                    if job.driveStartTime != nil {
                        updated.driveStartTime = driveStartTime
                    }
                    if job.driveEndTime != nil {
                        updated.driveEndTime = driveEndTime
                    }
                    onSave(updated)
                }
            )
            .alert("Delete Entry", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    onDelete(job)
                }
            } message: {
                Text("Are you sure you want to delete this entry? This action cannot be undone.")
            }
        }
    }
}
