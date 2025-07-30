#!/bin/bash

# ICAV Time Tracker v2 Repository Setup Script
# This script helps set up the v2 development repository

echo "🚀 Setting up ICAV Time Tracker v2 Repository..."

# Create the new repository directory
REPO_DIR="icav-time-dev"
mkdir -p $REPO_DIR

# Initialize git repository
cd $REPO_DIR
git init

# Create main branch with server code
echo "📦 Setting up main branch (server)..."
mkdir -p server
cp -r ../v2-server/* server/
cp ../v2-project-README.md README.md

# Create initial commit for server
git add .
git commit -m "Initial commit: v2 server with drive time support and DELETE functionality"

# Create ios-app branch
echo "📱 Creating ios-app branch..."
git checkout -b ios-app
rm -rf server
mkdir -p ios-app
cp -r ../v2-ios-app/* ios-app/
git add .
git commit -m "Add iOS app v2 with drive time tracking and DELETE functionality"

# Create android-app branch
echo "🤖 Creating android-app branch..."
git checkout -b android-app
rm -rf ios-app
mkdir -p android-app
cp -r ../v2-android-app/* android-app/
git add .
git commit -m "Add Android app v2 with drive time tracking and DELETE functionality"

# Return to main branch
git checkout main

echo "✅ Repository setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add remote origin: git remote add origin https://github.com/jbake1990/icav-time-dev.git"
echo "2. Push all branches: git push -u origin main && git push -u origin ios-app && git push -u origin android-app"
echo "3. Deploy server to test Vercel project"
echo "4. Test with iOS and Android apps"
echo ""
echo "🌐 Repository structure:"
echo "  main branch: Server (WebApp + Database v2)"
echo "  ios-app branch: iOS app"
echo "  android-app branch: Android app"
