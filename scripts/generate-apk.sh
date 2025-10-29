#!/bin/bash

# Build Android APK and open the output folder

set -e

echo "Syncing Capacitor with Android..."
npm run build
npx cap sync android

echo "Building APK..."
cd android
./gradlew assembleDebug
cd ..

# Determine OS and open the APK folder
APK_PATH="android/app/build/outputs/apk/debug"

echo "Opening APK folder..."
case "$(uname -s)" in
  Darwin*)
    open "$APK_PATH"
    ;;
  Linux*)
    xdg-open "$APK_PATH" 2>/dev/null || echo "APK built at: $APK_PATH"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    explorer "$APK_PATH"
    ;;
  *)
    echo "APK built at: $APK_PATH"
    ;;
esac

echo "✓ APK generation complete!"

