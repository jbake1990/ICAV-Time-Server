#!/bin/bash

# Clean build script for ICAV Time Tracker Android App
# This script ensures a completely clean build without any cached test data

echo "🧹 Cleaning Android build..."

# Clean Gradle build
./gradlew clean

# Remove any cached data
rm -rf app/build/
rm -rf .gradle/
rm -rf build/

# Clean Android Studio cache (if exists)
rm -rf .idea/
rm -rf local.properties

echo "✅ Clean build completed!"
echo "📱 Now you can build a fresh APK without test data:"
echo "   ./gradlew assembleDebug"
echo "   or"
echo "   ./gradlew assembleRelease" 