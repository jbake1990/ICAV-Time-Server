# Time Periods Feature

## Overview

The Time Periods feature allows workers to have multiple clock in/out cycles within the same job entry. This is essential for scenarios where workers need to temporarily clock out for breaks, equipment issues, or other reasons, then clock back in to continue the same job.

## Problem Solved

Previously, the app only supported:
- Single clock in/out cycle per job
- Lunch breaks (separate from main work time)
- Drive time tracking

This was insufficient for real-world scenarios where workers need to:
- Take multiple breaks during a job
- Clock out for equipment issues
- Handle interruptions and return to the same job
- Track different types of breaks (lunch, rest, equipment, etc.)

## Solution Architecture

### 1. New Data Structure: TimePeriod

```kotlin
data class TimePeriod(
    val id: String = UUID.randomUUID().toString(),
    val startTime: Date,
    var endTime: Date? = null,
    val reason: String? = null, // e.g., "Work", "Break", "Equipment Issue", "Lunch"
    val notes: String? = null
)
```

### 2. Enhanced TimeEntry Model

The `TimeEntry` model now includes:
- **Legacy fields**: Maintained for backward compatibility
- **Time periods list**: New array of `TimePeriod` objects
- **Computed properties**: Total work time, current period status
- **Helper methods**: Start/end periods, query by reason

### 3. Database Schema

New `time_periods` table with:
- Foreign key to `time_entries`
- Start/end timestamps
- Reason field for categorization
- Notes field for additional context
- Proper indexing for performance

## Key Features

### 1. Multiple Clock Cycles
- Start new work periods within the same job
- End current periods and start new ones
- Track different types of periods (Work, Break, Equipment, etc.)

### 2. Flexible Period Management
```kotlin
// Start a new work period
entry.startNewPeriod("Work")

// End current period
entry.endCurrentPeriod()

// Add a break period
entry.addPeriod(startTime, endTime, "Break", "15-minute rest")

// Query periods by type
val workPeriods = entry.getPeriodsByReason("Work")
val totalBreakTime = entry.getTotalTimeByReason("Break")
```

### 3. Backward Compatibility
- Existing entries continue to work
- Legacy clock in/out fields preserved
- Gradual migration path available

### 4. Enhanced UI
- Time periods screen showing all cycles
- Visual indicators for active periods
- Duration calculations per period
- Total work time aggregation

## Usage Examples

### Scenario 1: Equipment Issue
1. Worker clocks in to job at 8:00 AM
2. Equipment breaks at 10:30 AM → Clock out
3. Equipment fixed at 11:00 AM → Clock back in
4. Job completed at 5:00 PM

**Result**: One job entry with three periods:
- Work: 8:00 AM - 10:30 AM (2.5 hours)
- Break: 10:30 AM - 11:00 AM (0.5 hours) 
- Work: 11:00 AM - 5:00 PM (6 hours)
- **Total**: 9 hours

### Scenario 2: Multiple Breaks
1. Start job at 8:00 AM
2. Morning break at 10:00 AM (15 min)
3. Lunch at 12:00 PM (30 min)
4. Afternoon break at 2:30 PM (10 min)
5. End job at 5:00 PM

**Result**: One job with multiple periods:
- Work: 8:00-10:00 (2 hours)
- Break: 10:00-10:15 (15 min)
- Work: 10:15-12:00 (1.75 hours)
- Lunch: 12:00-12:30 (30 min)
- Work: 12:30-2:30 (2 hours)
- Break: 2:30-2:40 (10 min)
- Work: 2:40-5:00 (2.33 hours)
- **Total**: 8.18 hours

## Implementation Status

### ✅ Completed
- [x] TimePeriod data model (Android & iOS)
- [x] Enhanced TimeEntry model with periods
- [x] Database migration script
- [x] ViewModel methods for period management
- [x] Basic UI screen for time periods
- [x] Backward compatibility maintained

### 🔄 In Progress
- [ ] Integration with existing clock in/out UI
- [ ] Period editing in timestamp dialogs
- [ ] Server API updates for time periods
- [ ] iOS ViewModel integration

### 📋 Planned
- [ ] Period reason selection UI
- [ ] Notes field for periods
- [ ] Period filtering and reporting
- [ ] Migration of existing data
- [ ] Enhanced period visualization

## Benefits

1. **Real-world flexibility**: Handles actual work scenarios
2. **Better time tracking**: Accurate recording of all work periods
3. **Improved reporting**: Detailed breakdown of time by activity
4. **User-friendly**: Simple clock in/out interface
5. **Backward compatible**: Existing data and workflows preserved

## Technical Notes

- Uses UUID for period IDs to avoid conflicts
- Maintains referential integrity in database
- Implements proper sync tracking for periods
- Supports offline functionality
- Scales well for large numbers of periods

## Migration Strategy

1. **Phase 1**: Deploy new data models alongside existing ones
2. **Phase 2**: Update UI to use time periods for new entries
3. **Phase 3**: Migrate existing entries (optional)
4. **Phase 4**: Deprecate legacy fields (future)

This approach ensures zero downtime and allows gradual adoption of the new feature. 