//
//  AuthManager.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var showingAlert = false
    @Published var alertMessage = ""
    @Published var isLoading = false
    
    private let userDefaults = UserDefaults.standard
    private let userKey = "CurrentUser"
    private let tokenKey = "AuthToken"
    private let apiService = APIService.shared
    
    // Test user credentials for development (fallback)
    private let testUsername = "test"
    private let testPassword = "test123"
    
    private var authToken: String? {
        get { userDefaults.string(forKey: tokenKey) }
        set { 
            if let token = newValue {
                userDefaults.set(token, forKey: tokenKey)
            } else {
                userDefaults.removeObject(forKey: tokenKey)
            }
        }
    }
    
    init() {
        loadUser()
        // Verify existing session on app start
        if let token = authToken {
            Task {
                await verifySession(token: token)
            }
        }
    }
    
    func login(username: String, password: String) {
        guard !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            showAlert("Please enter a username")
            return
        }
        
        guard !password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            showAlert("Please enter a password")
            return
        }
        
        guard password.count >= 4 else {
            showAlert("Password must be at least 4 characters")
            return
        }
        
        let cleanUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        
        isLoading = true
        
        Task {
            do {
                // Try API login first
                let authResponse = try await apiService.login(username: cleanUsername, password: cleanPassword)
                let user = apiService.convertToUser(authResponse.user)
                
                await MainActor.run {
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.authToken = authResponse.token
                    self.saveUser()
                    self.isLoading = false
                }
                
            } catch APIError.unauthorized {
                await MainActor.run {
                    self.showAlert("Invalid username or password")
                    self.isLoading = false
                }
                
            } catch APIError.networkUnavailable {
                // Fallback to offline mode with test credentials
                await MainActor.run {
                    self.handleOfflineLogin(username: cleanUsername, password: cleanPassword)
                }
                
            } catch {
                // Other network errors - try offline fallback
                await MainActor.run {
                    self.handleOfflineLogin(username: cleanUsername, password: cleanPassword)
                }
            }
        }
    }
    
    private func handleOfflineLogin(username: String, password: String) {
        // Check for test user in offline mode
        if username == testUsername && password == testPassword {
            let user = User(
                username: username,
                displayName: "Test Technician (Offline)",
                role: "tech"
            )
            currentUser = user
            isAuthenticated = true
            saveUser()
            isLoading = false
            showAlert("Logged in offline mode. Data will sync when connected.")
            return
        }
        
        // In offline mode, create a local user
        let user = User(
            username: username,
            displayName: username.capitalized,
            role: "tech"
        )
        
        currentUser = user
        isAuthenticated = true
        saveUser()
        isLoading = false
        showAlert("Logged in offline mode. Data will sync when connected.")
    }
    
    func logout() {
        if let token = authToken {
            Task {
                do {
                    try await apiService.logout(token: token)
                } catch {
                    print("Logout API call failed: \(error)")
                }
            }
        }
        
        currentUser = nil
        isAuthenticated = false
        authToken = nil
        userDefaults.removeObject(forKey: userKey)
    }
    
    private func verifySession(token: String) async {
        do {
            let authResponse = try await apiService.verifySession(token: token)
            let user = apiService.convertToUser(authResponse.user)
            
            await MainActor.run {
                self.currentUser = user
                self.isAuthenticated = true
                self.authToken = authResponse.token
            }
        } catch {
            // Session invalid, clear local data
            await MainActor.run {
                self.logout()
            }
        }
    }
    
    private func saveUser() {
        if let encoded = try? JSONEncoder().encode(currentUser) {
            userDefaults.set(encoded, forKey: userKey)
        }
    }
    
    private func loadUser() {
        if let data = userDefaults.data(forKey: userKey),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            currentUser = user
            // Don't set isAuthenticated here - let session verification handle that
        }
    }
    
    private func showAlert(_ message: String) {
        alertMessage = message
        showingAlert = true
    }
    
    // Helper function to get test credentials
    func getTestCredentials() -> (username: String, password: String) {
        return (testUsername, testPassword)
    }
    
    // Get current auth token for API calls
    func getCurrentToken() -> String? {
        return authToken
    }
    
    // Check if user is currently online
    var isOnline: Bool {
        return apiService.isOnline
    }
} 