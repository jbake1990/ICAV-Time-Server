//
//  TimeEntryRowView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct TimeEntryRowView: View {
    let entry: TimeEntry
    let onDelete: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(entry.customerName)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        // Sync status indicator
                        Text(entry.syncStatus)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    Text(entry.technicianName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if entry.isActive {
                    if entry.isDriving {
                        Text("DRIVING")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue)
                            .cornerRadius(8)
                    } else if entry.isOnLunch {
                        Text("LUNCH")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange)
                            .cornerRadius(8)
                    } else {
                        Text("ACTIVE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green)
                            .cornerRadius(8)
                    }
                } else {
                    Text(entry.formattedDuration ?? "")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                }
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if let clockInTime = entry.clockInTime {
                        Text("Clock In: \(formatDate(clockInTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if let clockOutTime = entry.clockOutTime {
                        Text("Clock Out: \(formatDate(clockOutTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if let driveStart = entry.driveStartTime {
                        Text("Drive Start: \(formatDate(driveStart))")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                    
                    if let driveEnd = entry.driveEndTime {
                        Text("Drive End: \(formatDate(driveEnd))")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                    
                    if let driveDuration = entry.formattedDriveDuration {
                        Text("Drive Duration: \(driveDuration)")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                    
                    if let lunchStart = entry.lunchStartTime {
                        Text("Lunch Start: \(formatDate(lunchStart))")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    if let lunchEnd = entry.lunchEndTime {
                        Text("Lunch End: \(formatDate(lunchEnd))")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    if let lunchDuration = entry.formattedLunchDuration {
                        Text("Lunch Duration: \(lunchDuration)")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                
                Spacer()
                
                if !entry.isActive {
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
} 