package com.example.icavtimetracker.data

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id")
    val id: String,
    @SerializedName("username")
    val username: String,
    @SerializedName("displayName")
    val displayName: String,
    @SerializedName("role")
    val role: String = "tech"
) {
    val isAdmin: Boolean
        get() = role == "admin"
    
    val isTech: Boolean
        get() = role == "tech"
} 