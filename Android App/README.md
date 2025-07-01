# ICAV Time Tracker - Android App

## Building the App

### Clean Build (Recommended for Distribution)

To ensure no test data is included in your APK:

1. **Run the clean build script:**
   ```bash
   ./clean-build.sh
   ```

2. **Build the APK:**
   ```bash
   # For debug build
   ./gradlew assembleDebug
   
   # For release build
   ./gradlew assembleRelease
   ```

### Why Clean Builds Matter

The app stores authentication and time entry data in SharedPreferences. When testing in Android Studio, this data can persist and potentially be included in exported APKs. The clean build process ensures:

- All cached data is removed
- SharedPreferences are cleared on fresh installs
- No test data from the simulator is included

### Manual Clean Build

If you prefer to clean manually:

1. **Clean Gradle:**
   ```bash
   ./gradlew clean
   ```

2. **Remove build directories:**
   ```bash
   rm -rf app/build/
   rm -rf .gradle/
   rm -rf build/
   ```

3. **Build fresh APK:**
   ```bash
   ./gradlew assembleDebug
   ```

### Installation

The APK will be generated in:
- Debug: `app/build/outputs/apk/debug/app-debug.apk`
- Release: `app/build/outputs/apk/release/app-release.apk`

### Features

- ✅ Time tracking with clock in/out
- ✅ Lunch break tracking
- ✅ Drive time tracking with customer name
- ✅ Persistent login state
- ✅ Cloud synchronization
- ✅ Clean data management

### Troubleshooting

If you still see test data after installation:

1. **Uninstall the app completely** from the device
2. **Run a clean build** using the script above
3. **Install the fresh APK**

The app is designed to clear any existing data on fresh installs, but completely removing the app first ensures a clean slate. 