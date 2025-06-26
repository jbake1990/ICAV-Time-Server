//
//  ContentView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthManager()
    @StateObject private var viewModel: TimeTrackerViewModel
    @State private var showingExportSheet = false
    
    init() {
        let auth = AuthManager()
        self._authManager = StateObject(wrappedValue: auth)
        self._viewModel = StateObject(wrappedValue: TimeTrackerViewModel(authManager: auth))
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                mainTimeTrackerView
            } else {
                LoginView(authManager: authManager)
            }
        }
    }
    
    private var mainTimeTrackerView: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with current status
                statusHeader
                
                // Input section
                inputSection
                
                // Clock in/out buttons
                clockButtons
                
                // Today's timestamps - expanded to take full remaining space
                ScrollView {
                    TodayTimestampsView(entries: viewModel.todayTimeEntries)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationTitle("ICAV Time Tracker")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    userInfoButton
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        // Sync button with status indicator
                        Button(action: {
                            viewModel.triggerSync()
                        }) {
                            HStack {
                                if viewModel.isSyncing {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: authManager.isOnline ? "cloud.circle" : "cloud.slash")
                                        .foregroundColor(authManager.isOnline ? .green : .orange)
                                }
                                
                                if viewModel.pendingSyncCount > 0 {
                                    Text("\(viewModel.pendingSyncCount)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.red)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .disabled(viewModel.isSyncing || !authManager.isAuthenticated)
                        
                        Button("Export") {
                            showingExportSheet = true
                        }
                        .disabled(viewModel.userTimeEntries.isEmpty)
                    }
                }
            }
            .alert("Alert", isPresented: $viewModel.showingAlert) {
                Button("OK") { }
            } message: {
                Text(viewModel.alertMessage)
            }
            .sheet(isPresented: $showingExportSheet) {
                ExportView(csvData: viewModel.exportData())
            }
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
                    
                    Text("Started at: \(formatDate(entry.clockInTime))")
                        .font(.caption)
                        .foregroundColor(.secondary)
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
            // Main cycling button (Driving → Clock In → Clock Out)
            Button(action: {
                switch viewModel.currentStatus {
                case .clockedOut:
                    if !viewModel.customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        viewModel.startDriving()
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
                            return "car"
                        case .driving:
                            return "clock.arrow.circlepath"
                        case .clockedIn:
                            return "clock.badge.checkmark"
                        case .onLunch:
                            return "clock.badge.checkmark"
                        }
                    }())
                    Text({
                        switch viewModel.currentStatus {
                        case .clockedOut:
                            return "Start Driving"
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
                        return Color.blue
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
