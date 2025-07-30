# ICAV Time Tracker v2 Development

This repository contains the v2 development version of the ICAV Time Tracker application.

## Repository Structure

### Main Branch: Server
- `WebApp/` - Vercel serverless API
- `Database/` - PostgreSQL schema and migrations
- Features: v2 schema with drive time support, DELETE functionality

### ios-app Branch: iOS Application
- `ICAV Time Tracker/` - iOS SwiftUI app
- Features: Drive time tracking, enhanced sync, improved UI

### android-app Branch: Android Application  
- `Android App/` - Android Jetpack Compose app
- Features: Drive time tracking, enhanced sync, improved UI

## v2 Features

### Server (Main Branch)
- ✅ Drive time columns (drive_start_time, drive_end_time)
- ✅ Nullable clock_in_time for driving-only entries
- ✅ DELETE endpoint for time entries
- ✅ Enhanced error handling and logging
- ✅ Support for multiple clock in/outs per job

### iOS App (ios-app Branch)
- ✅ Drive time tracking UI
- ✅ Driving-only entries
- ✅ DELETE functionality with confirmation
- ✅ Enhanced sync with v2 server
- ✅ Improved button state management

### Android App (android-app Branch)
- ✅ Drive time tracking UI
- ✅ Driving-only entries  
- ✅ DELETE functionality
- ✅ Enhanced sync with v2 server
- ✅ Improved error handling

## Development Workflow

1. **Server Development**: Work on main branch
2. **iOS Development**: Work on ios-app branch
3. **Android Development**: Work on android-app branch
4. **Testing**: Deploy server to test Vercel project
5. **Production**: Merge to production repo when ready

## Deployment

### Test Environment
- Deploy server from main branch to test Vercel project
- Test with iOS and Android apps from respective branches

### Production Environment  
- When testing is complete, merge server changes to production repo
- Deploy to production Vercel project
- Release apps to App Store and Google Play

## Database Migration

The v2 schema includes:
- Drive time columns added to time_entries table
- clock_in_time made nullable for driving-only entries
- Additional indexes for performance
- DELETE functionality for time entries

## API Compatibility

All v2 components are designed to work together:
- Server expects v2 schema
- Apps expect v2 API endpoints
- DELETE functionality works across all platforms
