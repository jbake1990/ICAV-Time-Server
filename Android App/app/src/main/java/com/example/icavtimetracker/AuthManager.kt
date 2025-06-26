package com.example.icavtimetracker

import android.content.Context
import android.content.SharedPreferences
import com.example.icavtimetracker.data.User
import com.google.gson.Gson

class AuthManager(context: Context) {
    private val sharedPreferences: SharedPreferences = context.getSharedPreferences(
        "auth_prefs", Context.MODE_PRIVATE
    )
    private val gson = Gson()
    
    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER = "user"
        private const val KEY_IS_AUTHENTICATED = "is_authenticated"
    }
    
    fun saveAuthData(token: String, user: User) {
        sharedPreferences.edit()
            .putString(KEY_AUTH_TOKEN, token)
            .putString(KEY_USER, gson.toJson(user))
            .putBoolean(KEY_IS_AUTHENTICATED, true)
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
        return sharedPreferences.getBoolean(KEY_IS_AUTHENTICATED, false)
    }
    
    fun clearAuthData() {
        sharedPreferences.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_USER)
            .putBoolean(KEY_IS_AUTHENTICATED, false)
            .apply()
    }
} 