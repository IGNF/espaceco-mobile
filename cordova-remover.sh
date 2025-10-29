#!/usr/bin/env bash

# Remove unused Cordova plugins
cordova plugin remove cordova-plugin-camera || true
cordova plugin remove cordova-plugin-network-information || true
cordova plugin remove cordova-plugin-insomnia || true
cordova plugin remove cordova-plugin-inappbrowser || true
npm uninstall cordova-plugin-email-composer || true

# Remove Cordova platforms
cordova platform remove android
cordova platform remove ios

# Remove Cordova
npm uninstall cordova
npm uninstall cordova-android
npm uninstall cordova-ios

# Remove Cordova directories
rm -r platforms plugins

# Install dependencies and sync Capacitor
npm install
npx cap sync