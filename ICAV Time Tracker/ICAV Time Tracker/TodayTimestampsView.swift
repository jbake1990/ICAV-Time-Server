//
//  TodayTimestampsView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct TodayTimestampsView: View {
    let entries: [TimeEntry]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Activity")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text(formatDate(Date()))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            if entries.isEmpty {
                Text("No activity recorded today")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(entries.sorted(by: { $0.clockInTime < $1.clockInTime })) { entry in
                        TodayTimestampRow(entry: entry)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}

struct TodayTimestampRow: View {
    let entry: TimeEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.customerName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Spacer()
                
                if entry.isActive {
                    if entry.isOnLunch {
                        Text("ON LUNCH")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange)
                            .cornerRadius(4)
                    } else if entry.isDriving {
                        Text("DRIVING")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue)
                            .cornerRadius(4)
                    } else {
                        Text("ACTIVE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                    }
                } else {
                    Text("COMPLETED")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .cornerRadius(4)
                }
            }
            
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text("Clock In: \(formatTime(entry.clockInTime))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let clockOutTime = entry.clockOutTime {
                    HStack {
                        Image(systemName: "clock.badge.checkmark")
                            .foregroundColor(.red)
                            .font(.caption)
                        Text("Clock Out: \(formatTime(clockOutTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let lunchStart = entry.lunchStartTime {
                    HStack {
                        Image(systemName: "cup.and.saucer")
                            .foregroundColor(.orange)
                            .font(.caption)
                        Text("Lunch Start: \(formatTime(lunchStart))")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                
                if let lunchEnd = entry.lunchEndTime {
                    HStack {
                        Image(systemName: "cup.and.saucer.fill")
                            .foregroundColor(.orange)
                            .font(.caption)
                        Text("Lunch End: \(formatTime(lunchEnd))")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                
                if let driveStart = entry.driveStartTime {
                    HStack {
                        Image(systemName: "car")
                            .foregroundColor(.blue)
                            .font(.caption)
                        Text("Drive Start: \(formatTime(driveStart))")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                if let driveEnd = entry.driveEndTime {
                    HStack {
                        Image(systemName: "car.fill")
                            .foregroundColor(.blue)
                            .font(.caption)
                        Text("Drive End: \(formatTime(driveEnd))")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                if let duration = entry.formattedDuration {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(.blue)
                            .font(.caption)
                        Text("Duration: \(duration)")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .fontWeight(.medium)
                    }
                }
                
                if let driveDuration = entry.formattedDriveDuration {
                    HStack {
                        Image(systemName: "car")
                            .foregroundColor(.blue)
                            .font(.caption)
                        Text("Drive Time: \(driveDuration)")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .fontWeight(.medium)
                    }
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

#Preview {
    TodayTimestampsView(entries: [])
} 