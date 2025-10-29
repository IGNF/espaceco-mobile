#!/usr/bin/env bash

# Install dependencies and build project
npm install
npm run build-dev

# Sync Capacitor
npx cap sync

# Install iOS pods
cd ios/App/App
pod install --repo-update
cd ../../..

# Generate assets (icon and splash screen)
npx @capacitor/assets generate --ios
npx @capacitor/assets generate --android