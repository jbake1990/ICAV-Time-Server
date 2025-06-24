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
    
    private let userDefaults = UserDefaults.standard
    private let userKey = "CurrentUser"
    private let passwordKey = "UserPassword"
    
    // Test user credentials for development
    private let testUsername = "test"
    private let testPassword = "test123"
    
    init() {
        loadUser()
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
        
        // Check for test user
        if cleanUsername == testUsername && cleanPassword == testPassword {
            let user = User(
                username: cleanUsername,
                displayName: "Test Technician"
            )
            currentUser = user
            isAuthenticated = true
            saveUser(password: cleanPassword)
            return
        }
        
        // For now, create a new user or use existing one
        // In a real app, this would validate against a server
        let user = User(
            username: cleanUsername,
            displayName: cleanUsername.capitalized
        )
        
        currentUser = user
        isAuthenticated = true
        saveUser(password: cleanPassword)
    }
    
    func logout() {
        currentUser = nil
        isAuthenticated = false
        userDefaults.removeObject(forKey: userKey)
        userDefaults.removeObject(forKey: passwordKey)
    }
    
    private func saveUser(password: String) {
        if let encoded = try? JSONEncoder().encode(currentUser) {
            userDefaults.set(encoded, forKey: userKey)
            userDefaults.set(password, forKey: passwordKey)
        }
    }
    
    private func loadUser() {
        if let data = userDefaults.data(forKey: userKey),
           let user = try? JSONDecoder().decode(User.self, from: data),
           let _ = userDefaults.string(forKey: passwordKey) {
            currentUser = user
            isAuthenticated = true
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
} 