//
//  LoginView.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import SwiftUI

struct LoginView: View {
    @ObservedObject var authManager: AuthManager
    @State private var username = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // App Logo/Title
                VStack(spacing: 16) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)
                    
                    Text("ICAV Time Tracker")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("Field Technician Login")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 60)
                
                // Login Form
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Username")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("Enter your username", text: $username)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        HStack {
                            if isPasswordVisible {
                                TextField("Enter your password", text: $password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                            } else {
                                SecureField("Enter your password", text: $password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                            }
                            
                            Button(action: {
                                isPasswordVisible.toggle()
                            }) {
                                Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding(.horizontal, 30)
                
                // Login Button
                Button(action: {
                    authManager.login(username: username, password: password)
                }) {
                    HStack {
                        Image(systemName: "person.badge.key")
                        Text("Login")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 30)
                
                Spacer()
                
                // Footer
                VStack(spacing: 8) {
                    Text("Your login information will be saved locally")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Text("You can logout and change credentials later")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    // Test credentials for development
                    VStack(spacing: 4) {
                        Text("Test Credentials:")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        
                        Text("Username: \(authManager.getTestCredentials().username)")
                            .font(.caption2)
                            .foregroundColor(.blue)
                        
                        Text("Password: \(authManager.getTestCredentials().password)")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                    .padding(.top, 8)
                }
                .padding(.bottom, 30)
            }
            .alert("Login Error", isPresented: $authManager.showingAlert) {
                Button("OK") { }
            } message: {
                Text(authManager.alertMessage)
            }
        }
    }
} 