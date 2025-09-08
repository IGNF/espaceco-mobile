#!/usr/bin/env bash

cordova plugin remove cordova-plugin-camera
cordova plugin remove cordova-plugin-network-information
cordova plugin remove cordova-plugin-insomnia
cordova plugin remove cordova-plugin-inappbrowser
npm uninstall cordova-plugin-email-composer

cordova platform remove android
cordova platform remove ios

npm uninstall cordova
npm uninstall cordova-android
npm uninstall cordova-ios

rm -r platforms plugins

npm install
npx cap sync

