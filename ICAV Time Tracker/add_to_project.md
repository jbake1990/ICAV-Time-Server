# Adding APIService.swift to Xcode Project

## Steps to add the new file to your Xcode project:

1. **Open your ICAV Time Tracker project in Xcode**

2. **Add APIService.swift to the project:**
   - Right-click on the "ICAV Time Tracker" folder in the Project Navigator
   - Select "Add Files to 'ICAV Time Tracker'"
   - Navigate to the project folder and select `APIService.swift`
   - Make sure "Add to target" is checked for "ICAV Time Tracker"
   - Click "Add"

3. **Update your Vercel deployment URL:**
   - Open `APIService.swift` in Xcode
   - Find the line: `private let baseURL = "https://your-app.vercel.app"`
   - Replace `"https://your-app.vercel.app"` with your actual Vercel deployment URL

4. **Build and test:**
   - Build the project (⌘+B) to ensure no compilation errors
   - Run the app in the simulator to test the new offline-first functionality

## What's New:

✅ **Offline-First Architecture**: App works without internet, syncs when connected
✅ **Real Authentication**: Connects to your Vercel backend with role-based access
✅ **Automatic Sync**: Time entries sync automatically when connectivity is available
✅ **Sync Status UI**: Visual indicators showing online/offline status and pending syncs
✅ **Error Handling**: Graceful fallbacks when network is unavailable

## Testing the Integration:

1. **Online Mode**: Login with credentials from your web dashboard
2. **Offline Mode**: Turn off internet, create time entries, they'll be stored locally
3. **Sync**: When internet returns, tap the sync button to upload pending data
4. **Cross-Platform**: View entries created on iOS in your web dashboard

Your iOS app is now fully integrated with the database! 🎉 