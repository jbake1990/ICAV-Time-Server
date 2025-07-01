package com.example.icavtimetracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.icavtimetracker.ui.screens.LoginScreen
import com.example.icavtimetracker.ui.screens.MainScreen
import com.example.icavtimetracker.ui.theme.ICAVTimeTrackerTheme
import com.example.icavtimetracker.viewmodel.TimeTrackerViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Clear any existing auth data on fresh installs to prevent test data persistence
        val authManager = AuthManager(applicationContext)
        val sharedPrefs = getSharedPreferences("app_prefs", MODE_PRIVATE)
        val isFirstLaunch = sharedPrefs.getBoolean("is_first_launch", true)
        
        if (isFirstLaunch) {
            // This is a fresh install, clear any existing app data
            authManager.clearAllAppData()
            sharedPrefs.edit().putBoolean("is_first_launch", false).apply()
        }
        
        setContent {
            ICAVTimeTrackerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    TimeTrackerApp(application)
                }
            }
        }
    }
}

@Composable
fun TimeTrackerApp(application: android.app.Application) {
    val navController = rememberNavController()
    val viewModel: TimeTrackerViewModel = viewModel { TimeTrackerViewModel(application) }
    val isAuthenticated by viewModel.isAuthenticated.collectAsState()
    
    NavHost(
        navController = navController, 
        startDestination = if (isAuthenticated) "main" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("main") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                viewModel = viewModel
            )
        }
        composable("main") {
            MainScreen(
                onLogout = {
                    viewModel.logout()
                    navController.navigate("login") {
                        popUpTo("main") { inclusive = true }
                    }
                },
                viewModel = viewModel
            )
        }
    }
} 