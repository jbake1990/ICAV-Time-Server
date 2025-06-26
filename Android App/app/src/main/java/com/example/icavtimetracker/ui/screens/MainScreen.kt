package com.example.icavtimetracker.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.icavtimetracker.data.ClockStatus
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.viewmodel.TimeTrackerViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    viewModel: TimeTrackerViewModel
) {
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val clockStatus by viewModel.clockStatus.collectAsStateWithLifecycle()
    val currentEntry by viewModel.currentEntry.collectAsStateWithLifecycle()
    val timeEntries by viewModel.timeEntries.collectAsStateWithLifecycle()
    val pendingSyncCount by viewModel.pendingSyncCount.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    
    var customerName by remember { mutableStateOf("") }
    
    // Clear error after a delay
    LaunchedEffect(error) {
        if (error != null) {
            kotlinx.coroutines.delay(5000)
            viewModel.clearError()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ICAV Time Tracker") },
                navigationIcon = {
                    // User info button
                    currentUser?.let { _ ->
                        IconButton(onClick = { /* TODO: Show user menu */ }) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "User"
                            )
                        }
                    }
                },
                actions = {
                    // Sync button with pending count
                    IconButton(
                        onClick = { viewModel.syncAllPending() }
                    ) {
                        Box {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Sync"
                            )
                            if (pendingSyncCount > 0) {
                                Badge(
                                    modifier = Modifier.align(Alignment.TopEnd)
                                ) {
                                    Text(pendingSyncCount.toString())
                                }
                            }
                        }
                    }
                    IconButton(onClick = onLogout) {
                        Icon(
                            imageVector = Icons.Default.ExitToApp,
                            contentDescription = "Logout"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status Header
            item {
                StatusHeader(
                    clockStatus = clockStatus,
                    currentEntry = currentEntry,
                    pendingSyncCount = pendingSyncCount
                )
            }
            
            // Input Section
            item {
                InputSection(
                    customerName = customerName,
                    onCustomerNameChange = { customerName = it },
                    isDisabled = clockStatus == ClockStatus.CLOCKED_IN || clockStatus == ClockStatus.ON_LUNCH || clockStatus == ClockStatus.DRIVING
                )
            }
            
            // Clock Buttons
            item {
                ClockButtons(
                    clockStatus = clockStatus,
                    customerName = customerName,
                    onClockIn = {
                        if (customerName.isNotBlank()) {
                            viewModel.clockIn(customerName)
                            // Only clear customer name if not coming from driving state
                            if (clockStatus != ClockStatus.DRIVING) {
                                customerName = ""
                            }
                        }
                    },
                    onClockOut = { viewModel.clockOut() },
                    onStartLunch = { viewModel.startLunch() },
                    onEndLunch = { viewModel.endLunch() },
                    onStartDriving = {
                        if (customerName.isNotBlank()) {
                            viewModel.startDriving(customerName)
                        }
                    },
                    onEndDriving = { viewModel.endDriving() }
                )
            }
            
            // Today's Activity
            item {
                Text(
                    text = "Today's Activity",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
            
            // Today's entries
            val todayEntries: List<TimeEntry> = timeEntries.filter { entry ->
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val entryDate = entry.clockInTime?.let { clockInTime ->
                    Calendar.getInstance().apply {
                        time = clockInTime
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                }
                entryDate?.time == today.time
            }.sortedBy { it.clockInTime }
            
            if (todayEntries.size == 0) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No activity recorded today",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                items(todayEntries) { entry ->
                    TodayTimestampRow(entry = entry)
                }
            }
            
            // Error message
            if (error != null) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            text = error!!,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun StatusHeader(
    clockStatus: ClockStatus,
    currentEntry: TimeEntry?,
    pendingSyncCount: Int
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(
                                color = when (clockStatus) {
                                    ClockStatus.CLOCKED_OUT -> Color.Gray
                                    ClockStatus.DRIVING -> Color(0xFF2196F3) // Blue
                                    ClockStatus.CLOCKED_IN -> Color.Green
                                    ClockStatus.ON_LUNCH -> Color(0xFFFF9800) // Orange
                                },
                                shape = RoundedCornerShape(6.dp)
                            )
                    )
                    
                    Text(
                        text = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> "Ready to Clock In"
                            ClockStatus.DRIVING -> "Currently Driving"
                            ClockStatus.CLOCKED_IN -> "Currently Clocked In"
                            ClockStatus.ON_LUNCH -> "On Lunch Break"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        color = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> Color.Gray
                            ClockStatus.DRIVING -> Color(0xFF2196F3) // Blue
                            ClockStatus.CLOCKED_IN -> Color.Green
                            ClockStatus.ON_LUNCH -> Color(0xFFFF9800) // Orange
                        }
                    )
                }
                
                // Sync status
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color.Green
                        )
                        Text(
                            text = "Online",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    if (pendingSyncCount > 0) {
                        Text(
                            text = "$pendingSyncCount pending",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFFFF9800) // Orange
                        )
                    } else {
                        Text(
                            text = "Synced",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.Green
                        )
                    }
                }
            }
            
            // Current work info
            when (clockStatus) {
                ClockStatus.CLOCKED_IN -> {
                    currentEntry?.let { entry ->
                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "Currently working for: ${entry.customerName}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            entry.clockInTime?.let { clockInTime ->
                                Text(
                                    text = "Started at: ${SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(clockInTime)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                ClockStatus.ON_LUNCH -> {
                    currentEntry?.let { entry ->
                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "On lunch break from: ${entry.customerName}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            entry.lunchStartTime?.let { lunchStart ->
                                Text(
                                    text = "Lunch started at: ${SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(lunchStart)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                ClockStatus.DRIVING -> {
                    currentEntry?.let { entry ->
                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "Currently driving to: ${entry.customerName}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            entry.driveStartTime?.let { driveStart ->
                                Text(
                                    text = "Drive started at: ${SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(driveStart)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                else -> { /* No additional info for clocked out */ }
            }
        }
    }
}

@Composable
fun InputSection(
    customerName: String,
    onCustomerNameChange: (String) -> Unit,
    isDisabled: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Customer Name",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
            
            OutlinedTextField(
                value = customerName,
                onValueChange = onCustomerNameChange,
                placeholder = { Text("Enter customer name") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isDisabled,
                singleLine = true
            )
        }
    }
}

@Composable
fun ClockButtons(
    clockStatus: ClockStatus,
    customerName: String,
    onClockIn: () -> Unit,
    onClockOut: () -> Unit,
    onStartLunch: () -> Unit,
    onEndLunch: () -> Unit,
    onStartDriving: () -> Unit,
    onEndDriving: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Main cycling button (Driving → Clock In → Clock Out)
            Button(
                onClick = {
                    when (clockStatus) {
                        ClockStatus.CLOCKED_OUT -> onStartDriving()
                        ClockStatus.DRIVING -> onClockIn()
                        ClockStatus.CLOCKED_IN -> onClockOut()
                        ClockStatus.ON_LUNCH -> onClockOut()
                    }
                },
                enabled = when (clockStatus) {
                    ClockStatus.CLOCKED_OUT -> customerName.isNotBlank()
                    ClockStatus.DRIVING -> true
                    ClockStatus.CLOCKED_IN -> true
                    ClockStatus.ON_LUNCH -> true
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = when (clockStatus) {
                        ClockStatus.CLOCKED_OUT -> Color(0xFF2196F3) // Blue for driving
                        ClockStatus.DRIVING -> Color.Green // Green for clock in
                        ClockStatus.CLOCKED_IN -> Color.Red // Red for clock out
                        ClockStatus.ON_LUNCH -> Color.Red // Red for clock out
                    }
                )
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> Icons.Default.LocationOn
                            ClockStatus.DRIVING -> Icons.Default.PlayArrow
                            ClockStatus.CLOCKED_IN -> Icons.Default.Close
                            ClockStatus.ON_LUNCH -> Icons.Default.Close
                        },
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> "Start Driving"
                            ClockStatus.DRIVING -> "Clock In"
                            ClockStatus.CLOCKED_IN -> "Clock Out"
                            ClockStatus.ON_LUNCH -> "Clock Out"
                        },
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // Lunch button
            Button(
                onClick = if (clockStatus == ClockStatus.ON_LUNCH) onEndLunch else onStartLunch,
                enabled = clockStatus == ClockStatus.CLOCKED_IN || clockStatus == ClockStatus.ON_LUNCH,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.Green
                )
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (clockStatus == ClockStatus.ON_LUNCH) Icons.Default.Check else Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = if (clockStatus == ClockStatus.ON_LUNCH) "End Lunch" else "Start Lunch",
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
fun TodayTimestampRow(entry: TimeEntry) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Header with customer name and status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = entry.customerName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                
                // Status badge
                val (statusText, statusColor) = when {
                    entry.isActive && entry.isOnLunch -> "ON LUNCH" to Color(0xFFFF9800) // Orange
                    entry.isActive && entry.isDriving -> "DRIVING" to Color(0xFF2196F3) // Blue
                    entry.isActive -> "ACTIVE" to Color.Green
                    else -> "COMPLETED" to Color.Blue
                }
                
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .background(
                            color = statusColor,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            
            // Time details
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                // Clock In
                entry.clockInTime?.let { clockInTime ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color.Green
                        )
                        Text(
                            text = "Clock In: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(clockInTime)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                // Clock Out
                entry.clockOutTime?.let { clockOutTime ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color.Red
                        )
                        Text(
                            text = "Clock Out: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(clockOutTime)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                // Lunch Start
                entry.lunchStartTime?.let { lunchStart ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFFFF9800) // Orange
                        )
                        Text(
                            text = "Lunch Start: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(lunchStart)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFFF9800) // Orange
                        )
                    }
                }
                
                // Lunch End
                entry.lunchEndTime?.let { lunchEnd ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFFFF9800) // Orange
                        )
                        Text(
                            text = "Lunch End: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(lunchEnd)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFFF9800) // Orange
                        )
                    }
                }
                
                // Drive Start
                entry.driveStartTime?.let { driveStart ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFF2196F3) // Blue
                        )
                        Text(
                            text = "Drive Start: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(driveStart)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF2196F3) // Blue
                        )
                    }
                }
                
                // Drive End
                entry.driveEndTime?.let { driveEnd ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFF2196F3) // Blue
                        )
                        Text(
                            text = "Drive End: ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(driveEnd)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF2196F3) // Blue
                        )
                    }
                }
                
                // Duration
                entry.formattedDuration?.let { duration ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color.Blue
                        )
                        Text(
                            text = "Duration: $duration",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = Color.Blue
                        )
                    }
                }
                
                // Drive Duration
                entry.formattedDriveDuration?.let { driveDuration ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFF2196F3) // Blue
                        )
                        Text(
                            text = "Drive Time: $driveDuration",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF2196F3) // Blue
                        )
                    }
                }
            }
        }
    }
} 