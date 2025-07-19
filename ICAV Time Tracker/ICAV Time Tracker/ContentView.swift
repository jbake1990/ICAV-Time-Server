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
                                    if !newJobName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                        print("Adding new job: \(newJobName)")
                                        let newEntry = TimeEntry(
                                            userId: authManager.currentUser?.id ?? UUID().uuidString,
                                            technicianName: authManager.currentUser?.displayName ?? "",
                                            customerName: newJobName.trimmingCharacters(in: .whitespacesAndNewlines)
                                        )
                                        viewModel.timeEntries.append(newEntry)
                                        selectedJob = newEntry
                                        newJobName = ""
                                        showingNewJobAlert = false
                                        print("New job added, total jobs: \(viewModel.timeEntries.count)")
                                    }
                                }
                                .disabled(newJobName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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

            // Customer Name Input (only show when clocked out)
            if case .clockedOut = viewModel.currentStatus {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Customer Name")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    TextField("Enter customer name", text: $viewModel.customerName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .padding(.horizontal)
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }
            
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
                    editJob = job
                    showingEditSheet = true
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
                        
                        // Trigger sync to delete from server
                        viewModel.triggerSync()
                        showingEditSheet = false
                        print("✅ Deletion completed")
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
        case "Start Lunch":
            viewModel.startLunch()
        case "End Lunch":
            viewModel.endLunch()
        case "Start Driving":
            if let selectedJob = selectedJob {
                viewModel.startDriving(customerName: selectedJob.customerName)
            } else {
                viewModel.startDriving()
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
                "Start Lunch": .unavailable,
                "End Lunch": .unavailable,
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
            let hasCustomerName = !selectedJob.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
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
                    Text("Currently driving to: \(viewModel.customerName)")
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
    
    private var inputSection: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Customer Name")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                TextField("Enter customer name", text: $viewModel.customerName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .disabled({
                        switch viewModel.currentStatus {
                        case .clockedOut:
                            return false
                        case .driving:
                            return true
                        case .clockedIn:
                            return true
                        case .onLunch:
                            return true
                        }
                    }())
            }
        }
        .padding()
    }
    
    private var clockButtons: some View {
        VStack(spacing: 16) {
            // Clock In/Out Button
            Button(action: {
                switch viewModel.currentStatus {
                case .clockedOut:
                    if !viewModel.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        viewModel.clockIn()
                    }
                case .driving:
                    viewModel.clockIn()
                case .clockedIn:
                    viewModel.clockOut()
                case .onLunch:
                    viewModel.clockOut()
                }
            }) {
                HStack {
                    Image(systemName: {
                        switch viewModel.currentStatus {
                        case .clockedOut:
                            return "play.circle"
                        case .driving:
                            return "play.circle"
                        case .clockedIn:
                            return "stop.circle"
                        case .onLunch:
                            return "stop.circle"
                        }
                    }())
                    Text({
                        switch viewModel.currentStatus {
                        case .clockedOut:
                            return "Clock In"
                        case .driving:
                            return "Clock In"
                        case .clockedIn:
                            return "Clock Out"
                        case .onLunch:
                            return "Clock Out"
                        }
                    }())
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background({
                    switch viewModel.currentStatus {
                    case .clockedOut:
                        return Color.green
                    case .driving:
                        return Color.green
                    case .clockedIn:
                        return Color.red
                    case .onLunch:
                        return Color.red
                    }
                }())
                .cornerRadius(12)
            }
            .disabled({
                switch viewModel.currentStatus {
                case .clockedOut:
                    return viewModel.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                case .driving:
                    return false
                case .clockedIn:
                    return false
                case .onLunch:
                    return false
                }
            }())
            
            // Start Driving Button (only show when clocked out)
            if case .clockedOut = viewModel.currentStatus {
                Button(action: {
                    viewModel.startDriving()
                }) {
                    HStack {
                        Image(systemName: "car")
                        Text("Start Driving")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
                .disabled(viewModel.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            
            // Lunch Break Button
            Button(action: {
                if viewModel.currentStatus.isOnLunch {
                    viewModel.endLunch()
                } else {
                    viewModel.startLunch()
                }
            }) {
                HStack {
                    Image(systemName: viewModel.currentStatus.isOnLunch ? "cup.and.saucer.fill" : "cup.and.saucer")
                    Text(viewModel.currentStatus.isOnLunch ? "End Lunch" : "Start Lunch")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .cornerRadius(12)
            }
            .disabled({
                switch viewModel.currentStatus {
                case .clockedOut:
                    return false
                case .driving:
                    return true
                case .clockedIn:
                    return false
                case .onLunch:
                    return false
                }
            }())
        }
        .padding()
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
        self.job = job
        self.onSave = onSave
        self.onDelete = onDelete
        // Use job values or default to now
        _clockInTime = State(initialValue: job.clockInTime ?? Date())
        _clockOutTime = State(initialValue: job.clockOutTime ?? Date())
        _lunchStartTime = State(initialValue: job.lunchStartTime ?? Date())
        _lunchEndTime = State(initialValue: job.lunchEndTime ?? Date())
        _driveStartTime = State(initialValue: job.driveStartTime ?? Date())
        _driveEndTime = State(initialValue: job.driveEndTime ?? Date())
    }
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Clock In/Out")) {
                    DatePicker("Clock In", selection: $clockInTime, displayedComponents: [.date, .hourAndMinute])
                    DatePicker("Clock Out", selection: $clockOutTime, displayedComponents: [.date, .hourAndMinute])
                }
                Section(header: Text("Lunch")) {
                    DatePicker("Lunch Start", selection: $lunchStartTime, displayedComponents: [.date, .hourAndMinute])
                    DatePicker("Lunch End", selection: $lunchEndTime, displayedComponents: [.date, .hourAndMinute])
                }
                Section(header: Text("Drive")) {
                    DatePicker("Drive Start", selection: $driveStartTime, displayedComponents: [.date, .hourAndMinute])
                    DatePicker("Drive End", selection: $driveEndTime, displayedComponents: [.date, .hourAndMinute])
                }
                
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
                    updated.clockInTime = clockInTime
                    updated.clockOutTime = clockOutTime
                    updated.lunchStartTime = lunchStartTime
                    updated.lunchEndTime = lunchEndTime
                    updated.driveStartTime = driveStartTime
                    updated.driveEndTime = driveEndTime
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
