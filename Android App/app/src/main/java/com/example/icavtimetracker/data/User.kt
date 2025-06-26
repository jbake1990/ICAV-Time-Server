package com.example.icavtimetracker.data

import com.google.gson.annotations.SerializedName
import java.util.UUID

data class User(
    @SerializedName("id")
    val id: String = UUID.randomUUID().toString(),
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