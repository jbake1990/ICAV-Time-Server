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
    
    init(id: String = UUID().uuidString, username: String, displayName: String) {
        self.id = id
        self.username = username
        self.displayName = displayName
    }
} 