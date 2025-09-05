#!/usr/bin/env bash

cordova plugin remove cordova-plugin-camera
cordova plugin remove cordova-plugin-network-information
cordova plugin remove cordova-plugin-insomnia
cordova plugin remove cordova-plugin-inappbrowser

rm -r platforms plugins

npm install
npx cap sync

