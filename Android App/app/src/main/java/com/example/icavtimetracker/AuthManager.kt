package com.example.icavtimetracker

import android.content.Context
import android.content.SharedPreferences
import com.example.icavtimetracker.data.User
import com.google.gson.Gson
import java.util.*

class AuthManager(context: Context) {
    private val sharedPreferences: SharedPreferences = context.getSharedPreferences(
        "auth_prefs", Context.MODE_PRIVATE
    )
    private val gson = Gson()
    
    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER = "user"
        private const val KEY_IS_AUTHENTICATED = "is_authenticated"
        private const val KEY_TOKEN_EXPIRES_AT = "token_expires_at"
        private const val KEY_LAST_TOKEN_VERIFICATION = "last_token_verification"
    }
    
    fun saveAuthData(token: String, user: User, expiresAt: String? = null) {
        val expiresAtTime = expiresAt?.let { parseExpiresAt(it) } ?: (System.currentTimeMillis() + 24 * 60 * 60 * 1000)
        
        sharedPreferences.edit()
            .putString(KEY_AUTH_TOKEN, token)
            .putString(KEY_USER, gson.toJson(user))
            .putBoolean(KEY_IS_AUTHENTICATED, true)
            .putLong(KEY_TOKEN_EXPIRES_AT, expiresAtTime)
            .putLong(KEY_LAST_TOKEN_VERIFICATION, System.currentTimeMillis())
            .apply()
    }
    
    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }
    
    fun getUser(): User? {
        val userJson = sharedPreferences.getString(KEY_USER, null)
        return if (userJson != null) {
            try {
                gson.fromJson(userJson, User::class.java)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
    }
    
    fun isAuthenticated(): Boolean {
        val authenticated = sharedPreferences.getBoolean(KEY_IS_AUTHENTICATED, false)
        if (!authenticated) return false
        
        // Check if token is expired
        val expiresAt = sharedPreferences.getLong(KEY_TOKEN_EXPIRES_AT, 0)
        val isExpired = System.currentTimeMillis() > expiresAt
        
        if (isExpired) {
            clearAuthData()
            return false
        }
        
        return true
    }
    
    fun isTokenExpired(): Boolean {
        val expiresAt = sharedPreferences.getLong(KEY_TOKEN_EXPIRES_AT, 0)
        return System.currentTimeMillis() > expiresAt
    }
    
    fun shouldVerifyToken(): Boolean {
        val lastVerification = sharedPreferences.getLong(KEY_LAST_TOKEN_VERIFICATION, 0)
        val timeSinceLastVerification = System.currentTimeMillis() - lastVerification
        // Verify token every 15 minutes instead of 30 for better reliability
        return timeSinceLastVerification > 15 * 60 * 1000
    }
    
    fun updateTokenVerification() {
        sharedPreferences.edit()
            .putLong(KEY_LAST_TOKEN_VERIFICATION, System.currentTimeMillis())
            .apply()
    }
    
    fun getTokenExpirationTime(): Long {
        return sharedPreferences.getLong(KEY_TOKEN_EXPIRES_AT, 0)
    }
    
    fun clearAuthData() {
        sharedPreferences.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_USER)
            .putBoolean(KEY_IS_AUTHENTICATED, false)
            .remove(KEY_TOKEN_EXPIRES_AT)
            .remove(KEY_LAST_TOKEN_VERIFICATION)
            .apply()
    }
    
    fun clearAllAppData() {
        // Clear all SharedPreferences data
        sharedPreferences.edit().clear().apply()
        
        // Also clear any other app-specific data that might be stored
        // This ensures a completely clean slate on fresh installs
    }
    
    private fun parseExpiresAt(expiresAt: String): Long {
        return try {
            // Parse ISO 8601 date format
            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            dateFormat.parse(expiresAt)?.time ?: (System.currentTimeMillis() + 24 * 60 * 60 * 1000)
        } catch (e: Exception) {
            // Fallback to 24 hours from now
            System.currentTimeMillis() + 24 * 60 * 60 * 1000
        }
    }
} 