//
//  User.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation

struct User: Codable {
    let id: String
    let username: String
    let displayName: String
    let role: String
    
    init(id: String = UUID().uuidString, username: String, displayName: String, role: String = "tech") {
        self.id = id
        self.username = username
        self.displayName = displayName
        self.role = role
    }
    
    var isAdmin: Bool {
        return role == "admin"
    }
    
    var isTech: Bool {
        return role == "tech"
    }
} 