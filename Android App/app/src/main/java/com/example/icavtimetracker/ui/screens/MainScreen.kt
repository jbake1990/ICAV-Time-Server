package com.example.icavtimetracker.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.icavtimetracker.data.ClockStatus
import com.example.icavtimetracker.data.TimeEntry
import com.example.icavtimetracker.viewmodel.TimeTrackerViewModel
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar

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
    
    var selectedJob by remember { mutableStateOf<TimeEntry?>(null) }
    var showingLogoutDialog by remember { mutableStateOf(false) }
    var showNewJobDialog by remember { mutableStateOf(false) }
    var newJobCustomerName by remember { mutableStateOf("") }
    var showEditDialog by remember { mutableStateOf(false) }
    var editingEntry by remember { mutableStateOf<TimeEntry?>(null) }
    
    // Use derivedStateOf for expensive computations to prevent unnecessary recompositions
    val todayEntries by remember(timeEntries) {
        derivedStateOf {
            val today = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            timeEntries.filter { entry ->
                // Check if entry was created or modified today
                val entryDate = entry.clockInTime?.let { clockInTime ->
                    Calendar.getInstance().apply {
                        time = clockInTime
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                } ?: entry.driveStartTime?.let { driveStartTime ->
                    Calendar.getInstance().apply {
                        time = driveStartTime
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                } ?: entry.lastModified?.let { lastModified ->
                    Calendar.getInstance().apply {
                        time = lastModified
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                }
                entryDate?.time == today.time
            }.sortedByDescending { it.clockInTime ?: it.driveStartTime ?: it.lastModified ?: Date(0) }
        }
    }
    
    // Combine today's entries with current entry if it's not already included
    val allEntries by remember(todayEntries, currentEntry) {
        derivedStateOf {
            val entries = todayEntries.toMutableList()
            if (currentEntry != null && !entries.any { it.id == currentEntry!!.id }) {
                entries.add(currentEntry!!)
            }
            entries.sortedByDescending { it.clockInTime ?: it.driveStartTime ?: it.lastModified ?: Date(0) }
        }
    }
    
    // Set selected job if not already set
    LaunchedEffect(todayEntries) {
        if (selectedJob == null && todayEntries.isNotEmpty()) {
            selectedJob = todayEntries.first()
        }
    }
    
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
                    currentUser?.let { user ->
                        IconButton(onClick = { showingLogoutDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "User",
                                tint = MaterialTheme.colorScheme.primary
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
            // Online Status and Manual Sync Button
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = { viewModel.syncAllPending() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = Color(0xFF2E7D32)
                            )
                            Text(
                                text = "Online",
                                style = MaterialTheme.typography.labelSmall
                            )
                            if (pendingSyncCount > 0) {
                                Text(
                                    text = "($pendingSyncCount pending)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFFFF9800)
                                )
                            } else {
                                Text(
                                    text = "(Synced)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF2E7D32)
                                )
                            }
                        }
                    }
                }
            }
            

            
            // Selected Job
            item {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Text(
                        text = "Selected Job",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = selectedJob?.customerName ?: "None",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            
            // Action Buttons Grid
            item {
                ActionButtonsGrid(
                    clockStatus = clockStatus,
                    selectedJob = selectedJob,
                    onClockIn = {
                        if (clockStatus == ClockStatus.DRIVING) {
                            val drivingCustomerName = currentEntry?.customerName
                            if (drivingCustomerName != null) {
                                viewModel.clockIn(drivingCustomerName)
                            }
                        } else if (selectedJob != null) {
                            viewModel.clockIn(selectedJob!!.customerName)
                        }
                    },
                    onClockOut = { viewModel.clockOut() },
                    onStartLunch = { viewModel.startLunch() },
                    onEndLunch = { viewModel.endLunch() },
                    onStartDriving = {
                        if (selectedJob != null) {
                            viewModel.startDriving(selectedJob!!.customerName)
                        }
                    },
                    onEndDriving = { viewModel.endDriving() }
                )
            }
            
            // Jobs List
            item {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Jobs",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Button(
                            onClick = { showNewJobDialog = true }
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text("New Job")
                            }
                        }
                    }
                }
            }
            
            // Jobs List
            if (todayEntries.isEmpty() && currentEntry == null) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No jobs recorded today",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                items(allEntries) { entry ->
                    JobRow(
                        entry = entry,
                        isSelected = selectedJob?.id == entry.id,
                        onSelect = { selectedJob = entry },
                        onEdit = { 
                            editingEntry = entry
                            showEditDialog = true
                        }
                    )
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
    
    // Logout confirmation dialog
    if (showingLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showingLogoutDialog = false },
            title = { Text("User Menu") },
            text = {
                currentUser?.let { user ->
                    Text("Logged in as ${user.displayName} (@${user.username})")
                } ?: Text("User information not available")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showingLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Logout", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showingLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // New Job dialog
    if (showNewJobDialog) {
        AlertDialog(
            onDismissRequest = { showNewJobDialog = false },
            title = { Text("New Job") },
            text = {
                Column {
                    Text("Enter customer name for the new job:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newJobCustomerName,
                        onValueChange = { newJobCustomerName = it },
                        placeholder = { Text("Customer name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (newJobCustomerName.isNotBlank()) {
                            viewModel.createJob(newJobCustomerName)
                            newJobCustomerName = ""
                            showNewJobDialog = false
                        }
                    }
                ) {
                    Text("Create Job")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { 
                        newJobCustomerName = ""
                        showNewJobDialog = false 
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // Edit Time Entry dialog
    if (showEditDialog && editingEntry != null) {
        val entry = editingEntry!!
        var showDeleteAlert by remember { mutableStateOf(false) }
        
        // State for time pickers - only initialize for existing times
        var clockInTime by remember { mutableStateOf(entry.clockInTime) }
        var clockOutTime by remember { mutableStateOf(entry.clockOutTime) }
        var lunchStartTime by remember { mutableStateOf(entry.lunchStartTime) }
        var lunchEndTime by remember { mutableStateOf(entry.lunchEndTime) }
        var driveStartTime by remember { mutableStateOf(entry.driveStartTime) }
        var driveEndTime by remember { mutableStateOf(entry.driveEndTime) }
        
        // Time picker states
        var showClockInPicker by remember { mutableStateOf(false) }
        var showClockOutPicker by remember { mutableStateOf(false) }
        var showLunchStartPicker by remember { mutableStateOf(false) }
        var showLunchEndPicker by remember { mutableStateOf(false) }
        var showDriveStartPicker by remember { mutableStateOf(false) }
        var showDriveEndPicker by remember { mutableStateOf(false) }
        
        AlertDialog(
            onDismissRequest = { 
                showEditDialog = false
                editingEntry = null
            },
            title = { Text("Edit Timestamps") },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Customer: ${entry.customerName}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    
                    // Only show Clock In/Out section if there are clock times
                    if (entry.clockInTime != null || entry.clockOutTime != null) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "Clock In/Out",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium
                                )
                                
                                if (entry.clockInTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Clock In:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showClockInPicker = true }
                                        ) {
                                            Text(
                                                text = clockInTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                                
                                if (entry.clockOutTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Clock Out:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showClockOutPicker = true }
                                        ) {
                                            Text(
                                                text = clockOutTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Only show Lunch section if there are lunch times
                    if (entry.lunchStartTime != null || entry.lunchEndTime != null) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "Lunch",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium
                                )
                                
                                if (entry.lunchStartTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Lunch Start:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showLunchStartPicker = true }
                                        ) {
                                            Text(
                                                text = lunchStartTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                                
                                if (entry.lunchEndTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Lunch End:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showLunchEndPicker = true }
                                        ) {
                                            Text(
                                                text = lunchEndTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Only show Drive section if there are drive times
                    if (entry.driveStartTime != null || entry.driveEndTime != null) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "Drive",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium
                                )
                                
                                if (entry.driveStartTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Drive Start:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showDriveStartPicker = true }
                                        ) {
                                            Text(
                                                text = driveStartTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                                
                                if (entry.driveEndTime != null) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Drive End:")
                                        Spacer(modifier = Modifier.weight(1f))
                                        Button(
                                            onClick = { showDriveEndPicker = true }
                                        ) {
                                            Text(
                                                text = driveEndTime?.let { 
                                                    SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(it)
                                                } ?: "Set Time"
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Delete button
                    Button(
                        onClick = { showDeleteAlert = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Text("Delete Entry")
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        // Save changes to the entry
                        val updatedEntry = entry.copy(
                            clockInTime = clockInTime,
                            clockOutTime = clockOutTime,
                            lunchStartTime = lunchStartTime,
                            lunchEndTime = lunchEndTime,
                            driveStartTime = driveStartTime,
                            driveEndTime = driveEndTime
                        )
                        viewModel.editTimeEntry(updatedEntry)
                        showEditDialog = false
                        editingEntry = null
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { 
                        showEditDialog = false
                        editingEntry = null
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
        
        // Delete confirmation dialog
        if (showDeleteAlert) {
            AlertDialog(
                onDismissRequest = { showDeleteAlert = false },
                title = { Text("Delete Entry") },
                text = { 
                    Text("Are you sure you want to delete this entry? This action cannot be undone.")
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.deleteEntry(entry)
                            showDeleteAlert = false
                            showEditDialog = false
                            editingEntry = null
                        }
                    ) {
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { showDeleteAlert = false }
                    ) {
                        Text("Cancel")
                    }
                }
            )
        }
        
        // Time picker dialogs
        if (showClockInPicker) {
            TimePickerDialog(
                onDismissRequest = { showClockInPicker = false },
                onTimeSelected = { 
                    clockInTime = it
                    showClockInPicker = false
                },
                initialTime = clockInTime ?: Date()
            )
        }
        
        if (showClockOutPicker) {
            TimePickerDialog(
                onDismissRequest = { showClockOutPicker = false },
                onTimeSelected = { 
                    clockOutTime = it
                    showClockOutPicker = false
                },
                initialTime = clockOutTime ?: Date()
            )
        }
        
        if (showLunchStartPicker) {
            TimePickerDialog(
                onDismissRequest = { showLunchStartPicker = false },
                onTimeSelected = { 
                    lunchStartTime = it
                    showLunchStartPicker = false
                },
                initialTime = lunchStartTime ?: Date()
            )
        }
        
        if (showLunchEndPicker) {
            TimePickerDialog(
                onDismissRequest = { showLunchEndPicker = false },
                onTimeSelected = { 
                    lunchEndTime = it
                    showLunchEndPicker = false
                },
                initialTime = lunchEndTime ?: Date()
            )
        }
        
        if (showDriveStartPicker) {
            TimePickerDialog(
                onDismissRequest = { showDriveStartPicker = false },
                onTimeSelected = { 
                    driveStartTime = it
                    showDriveStartPicker = false
                },
                initialTime = driveStartTime ?: Date()
            )
        }
        
        if (showDriveEndPicker) {
            TimePickerDialog(
                onDismissRequest = { showDriveEndPicker = false },
                onTimeSelected = { 
                    driveEndTime = it
                    showDriveEndPicker = false
                },
                initialTime = driveEndTime ?: Date()
            )
        }
    }
}

@Composable
fun ActionButtonsGrid(
    clockStatus: ClockStatus,
    selectedJob: TimeEntry?,
    onClockIn: () -> Unit,
    onClockOut: () -> Unit,
    onStartLunch: () -> Unit,
    onEndLunch: () -> Unit,
    onStartDriving: () -> Unit,
    onEndDriving: () -> Unit
) {
    val buttonStates = remember(clockStatus, selectedJob) {
        mapOf(
            "Clock In" to when {
                selectedJob == null -> ButtonState.UNAVAILABLE
                clockStatus == ClockStatus.CLOCKED_OUT -> ButtonState.AVAILABLE
                clockStatus == ClockStatus.DRIVING -> ButtonState.AVAILABLE
                else -> ButtonState.UNAVAILABLE
            },
            "Clock Out" to when {
                clockStatus == ClockStatus.CLOCKED_IN -> ButtonState.AVAILABLE
                clockStatus == ClockStatus.ON_LUNCH -> ButtonState.AVAILABLE
                else -> ButtonState.UNAVAILABLE
            },
            "Start Lunch" to when {
                clockStatus == ClockStatus.CLOCKED_IN -> ButtonState.AVAILABLE
                clockStatus == ClockStatus.CLOCKED_OUT -> ButtonState.AVAILABLE
                clockStatus == ClockStatus.DRIVING -> ButtonState.AVAILABLE
                else -> ButtonState.UNAVAILABLE
            },
            "End Lunch" to when {
                clockStatus == ClockStatus.ON_LUNCH -> ButtonState.ACTIVE
                else -> ButtonState.UNAVAILABLE
            },
            "Start Driving" to when {
                clockStatus == ClockStatus.CLOCKED_OUT -> if (selectedJob != null) ButtonState.AVAILABLE else ButtonState.UNAVAILABLE
                else -> ButtonState.UNAVAILABLE
            },
            "End Driving" to when {
                clockStatus == ClockStatus.DRIVING -> ButtonState.AVAILABLE
                else -> ButtonState.UNAVAILABLE
            }
        )
    }
    
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Row 1: Clock In, Clock Out
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton(
                title = "Clock In",
                icon = Icons.Default.KeyboardArrowUp,
                state = buttonStates["Clock In"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color(0xFF2196F3),
                darkColor = Color(0xFF1565C0),
                onClick = onClockIn,
                modifier = Modifier.weight(1f)
            )
            ActionButton(
                title = "Clock Out",
                icon = Icons.Default.KeyboardArrowDown,
                state = buttonStates["Clock Out"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color.Red,
                darkColor = Color(0xFF212121),
                onClick = onClockOut,
                modifier = Modifier.weight(1f)
            )
        }
        
        // Row 2: Start Lunch, End Lunch
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton(
                title = "Start Lunch",
                icon = Icons.Default.Star,
                state = buttonStates["Start Lunch"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color(0xFFFF9800),
                darkColor = Color(0xFFF57C00),
                onClick = onStartLunch,
                modifier = Modifier.weight(1f)
            )
            ActionButton(
                title = "End Lunch",
                icon = Icons.Default.Check,
                state = buttonStates["End Lunch"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color(0xFFFF9800),
                darkColor = Color(0xFFF57C00),
                onClick = onEndLunch,
                modifier = Modifier.weight(1f)
            )
        }
        
        // Row 3: Start Driving, End Driving
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton(
                title = "Start Driving",
                icon = Icons.Default.LocationOn,
                state = buttonStates["Start Driving"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color.Green,
                darkColor = Color(0xFF1B5E20),
                onClick = onStartDriving,
                modifier = Modifier.weight(1f)
            )
            ActionButton(
                title = "End Driving",
                icon = Icons.Default.Close,
                state = buttonStates["End Driving"] ?: ButtonState.UNAVAILABLE,
                brightColor = Color.Green,
                darkColor = Color(0xFF212121),
                onClick = onEndDriving,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

enum class ButtonState {
    UNAVAILABLE, AVAILABLE, ACTIVE
}

@Composable
fun ActionButton(
    title: String,
    icon: ImageVector,
    state: ButtonState,
    brightColor: Color,
    darkColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (bgColor, fgColor) = when (state) {
        ButtonState.UNAVAILABLE -> Color(0xFFF5F5F5) to Color.Gray
        ButtonState.AVAILABLE -> darkColor to Color.White
        ButtonState.ACTIVE -> brightColor to Color.White
    }
    
    Button(
        onClick = onClick,
        enabled = state != ButtonState.UNAVAILABLE,
        modifier = modifier
            .fillMaxWidth()
            .height(70.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = bgColor,
            contentColor = fgColor
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun JobRow(
    entry: TimeEntry,
    isSelected: Boolean,
    onSelect: () -> Unit,
    onEdit: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clickable { onSelect() },
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = entry.customerName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                
                // Status badge
                val (statusText, statusColor) = when {
                    entry.isActive && entry.isOnLunch -> "ON LUNCH" to Color(0xFFFF9800)
                    entry.isActive && entry.isDriving -> "DRIVING" to Color(0xFF2196F3)
                    entry.isActive -> "ACTIVE" to Color.Green
                    else -> "COMPLETED" to Color.Blue
                }
                
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = statusColor
                )
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSelected) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                
                IconButton(
                    onClick = onEdit,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Edit",
                        tint = MaterialTheme.colorScheme.primary
                    )
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
                            val isStandaloneLunch = entry.customerName == "Lunch Break"
                            Text(
                                text = if (isStandaloneLunch) "On lunch break" else "On lunch break from: ${entry.customerName}",
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
            // Main cycling button (Clock In → Clock Out)
            Button(
                onClick = {
                    when (clockStatus) {
                        ClockStatus.CLOCKED_OUT -> onClockIn()
                        ClockStatus.DRIVING -> onClockIn()
                        ClockStatus.CLOCKED_IN -> onClockOut()
                        ClockStatus.ON_LUNCH -> onEndLunch() // End lunch instead of clock out when on lunch
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
                        ClockStatus.CLOCKED_OUT -> Color.Green // Green for clock in
                        ClockStatus.DRIVING -> Color.Green // Green for clock in
                        ClockStatus.CLOCKED_IN -> Color.Red // Red for clock out
                        ClockStatus.ON_LUNCH -> Color(0xFFFF9800) // Orange for end lunch
                    }
                )
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> Icons.Default.PlayArrow
                            ClockStatus.DRIVING -> Icons.Default.PlayArrow
                            ClockStatus.CLOCKED_IN -> Icons.Default.Close
                            ClockStatus.ON_LUNCH -> Icons.Default.Check
                        },
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = when (clockStatus) {
                            ClockStatus.CLOCKED_OUT -> "Clock In"
                            ClockStatus.DRIVING -> "Clock In"
                            ClockStatus.CLOCKED_IN -> "Clock Out"
                            ClockStatus.ON_LUNCH -> "End Lunch"
                        },
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // Driving button (only show when clocked out)
            if (clockStatus == ClockStatus.CLOCKED_OUT) {
                Button(
                    onClick = onStartDriving,
                    enabled = customerName.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2196F3) // Blue for driving
                    )
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Start Driving",
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
            
            // Lunch button
            Button(
                onClick = if (clockStatus == ClockStatus.ON_LUNCH) onEndLunch else onStartLunch,
                enabled = clockStatus == ClockStatus.CLOCKED_IN || clockStatus == ClockStatus.ON_LUNCH || clockStatus == ClockStatus.CLOCKED_OUT,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (clockStatus == ClockStatus.ON_LUNCH) Color(0xFFFF9800) else Color.Green
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
                
                // Lunch Duration
                entry.formattedLunchDuration?.let { lunchDuration ->
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
                            text = "Lunch Time: $lunchDuration",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFFF9800) // Orange
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TimePickerDialog(
    onDismissRequest: () -> Unit,
    onTimeSelected: (Date) -> Unit,
    initialTime: Date
) {
    var selectedDate by remember { mutableStateOf(initialTime) }
    
    Dialog(onDismissRequest = onDismissRequest) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Select Date and Time",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                
                // Date picker
                DatePicker(
                    selectedDate = selectedDate,
                    onDateSelected = { selectedDate = it }
                )
                
                // Time picker
                TimePicker(
                    selectedTime = selectedDate,
                    onTimeSelected = { selectedDate = it }
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    TextButton(onClick = onDismissRequest) {
                        Text("Cancel")
                    }
                    TextButton(
                        onClick = { onTimeSelected(selectedDate) }
                    ) {
                        Text("OK")
                    }
                }
            }
        }
    }
}

@Composable
fun DatePicker(
    selectedDate: Date,
    onDateSelected: (Date) -> Unit
) {
    val calendar = Calendar.getInstance().apply { time = selectedDate }
    var year by remember { mutableStateOf(calendar.get(Calendar.YEAR)) }
    var month by remember { mutableStateOf(calendar.get(Calendar.MONTH)) }
    var day by remember { mutableStateOf(calendar.get(Calendar.DAY_OF_MONTH)) }
    
    Column {
        Text(
            text = "Date",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Medium
        )
        
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Month picker
            OutlinedTextField(
                value = (month + 1).toString(),
                onValueChange = { 
                    val newMonth = it.toIntOrNull()?.minus(1) ?: month
                    if (newMonth in 0..11) {
                        month = newMonth
                        updateDate(year, month, day, onDateSelected)
                    }
                },
                label = { Text("Month") },
                modifier = Modifier.weight(1f),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )
            )
            
            // Day picker
            OutlinedTextField(
                value = day.toString(),
                onValueChange = { 
                    val newDay = it.toIntOrNull() ?: day
                    if (newDay in 1..31) {
                        day = newDay
                        updateDate(year, month, day, onDateSelected)
                    }
                },
                label = { Text("Day") },
                modifier = Modifier.weight(1f),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )
            )
            
            // Year picker
            OutlinedTextField(
                value = year.toString(),
                onValueChange = { 
                    val newYear = it.toIntOrNull() ?: year
                    if (newYear > 1900) {
                        year = newYear
                        updateDate(year, month, day, onDateSelected)
                    }
                },
                label = { Text("Year") },
                modifier = Modifier.weight(1f),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )
            )
        }
    }
}

@Composable
fun TimePicker(
    selectedTime: Date,
    onTimeSelected: (Date) -> Unit
) {
    val calendar = Calendar.getInstance().apply { time = selectedTime }
    var hour by remember { mutableStateOf(calendar.get(Calendar.HOUR_OF_DAY)) }
    var minute by remember { mutableStateOf(calendar.get(Calendar.MINUTE)) }
    
    Column {
        Text(
            text = "Time",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Medium
        )
        
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Hour picker
            OutlinedTextField(
                value = hour.toString(),
                onValueChange = { 
                    val newHour = it.toIntOrNull() ?: hour
                    if (newHour in 0..23) {
                        hour = newHour
                        updateTime(hour, minute, onTimeSelected)
                    }
                },
                label = { Text("Hour") },
                modifier = Modifier.weight(1f),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )
            )
            
            // Minute picker
            OutlinedTextField(
                value = minute.toString(),
                onValueChange = { 
                    val newMinute = it.toIntOrNull() ?: minute
                    if (newMinute in 0..59) {
                        minute = newMinute
                        updateTime(hour, minute, onTimeSelected)
                    }
                },
                label = { Text("Minute") },
                modifier = Modifier.weight(1f),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )
            )
        }
    }
}

private fun updateDate(year: Int, month: Int, day: Int, onDateSelected: (Date) -> Unit) {
    val calendar = Calendar.getInstance()
    calendar.set(year, month, day)
    onDateSelected(calendar.time)
}

private fun updateTime(hour: Int, minute: Int, onTimeSelected: (Date) -> Unit) {
    val calendar = Calendar.getInstance()
    calendar.set(Calendar.HOUR_OF_DAY, hour)
    calendar.set(Calendar.MINUTE, minute)
    onTimeSelected(calendar.time)
}