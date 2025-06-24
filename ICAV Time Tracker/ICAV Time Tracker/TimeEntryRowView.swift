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
                    Text(entry.customerName)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(entry.technicianName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if entry.isActive {
                    if entry.isOnLunch {
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
                    Text("Clock In: \(formatDate(entry.clockInTime))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let clockOutTime = entry.clockOutTime {
                        Text("Clock Out: \(formatDate(clockOutTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
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