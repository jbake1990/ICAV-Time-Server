package com.example.icavtimetracker.network

import com.google.gson.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.lang.reflect.Type
import java.text.SimpleDateFormat
import java.util.*

object NetworkClient {
    private const val BASE_URL = "https://icav-time-server.vercel.app/"
    
    private val gson = GsonBuilder()
        .registerTypeAdapter(Date::class.java, DateDeserializer())
        .registerTypeAdapter(Date::class.java, DateSerializer())
        .create()
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}

class DateDeserializer : JsonDeserializer<Date> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): Date {
        return when {
            json?.isJsonPrimitive == true -> {
                val dateString = json.asString
                try {
                    // Try ISO format first
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).parse(dateString)
                        ?: SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).parse(dateString)
                        ?: Date(json.asLong) // Fallback to timestamp
                } catch (e: Exception) {
                    Date(json.asLong) // Fallback to timestamp
                }
            }
            json?.isJsonPrimitive == true && json.asJsonPrimitive.isNumber -> {
                Date(json.asLong)
            }
            else -> Date()
        }
    }
}

class DateSerializer : JsonSerializer<Date> {
    override fun serialize(
        src: Date?,
        typeOfSrc: Type?,
        context: JsonSerializationContext?
    ): JsonElement {
        return if (src != null) {
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            JsonPrimitive(formatter.format(src))
        } else {
            JsonNull.INSTANCE
        }
    }
} 