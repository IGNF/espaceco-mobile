#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const VALID_TARGETS = new Set(['ios', 'android']);

function bumpAndroid(rootDir) {
  const file = path.join(rootDir, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(file)) {
    console.warn('Android: build.gradle not found, no increment applied');
    return null;
  }
  let txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/versionCode\s+(\d+)/g));
  if (!matches.length) {
    throw new Error('Android: no versionCode entries found');
  }
  const next = Math.max(...matches.map(m => parseInt(m[1], 10))) + 1;
  txt = txt.replace(/versionCode\s+\d+/g, `versionCode ${next}`);
  fs.writeFileSync(file, txt, 'utf8');
  console.log(`Android: versionCode incremented to ${next}`);
  return next;
}

function bumpIOS(rootDir) {
  const file = path.join(rootDir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(file)) {
    console.warn('iOS: project.pbxproj not found, no increment applied');
    return null;
  }
  let txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g));
  if (!matches.length) {
    throw new Error('iOS: no CURRENT_PROJECT_VERSION entries found');
  }
  const next = Math.max(...matches.map(m => parseInt(m[1], 10))) + 1;
  txt = txt.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${next};`);
  fs.writeFileSync(file, txt, 'utf8');
  console.log(`iOS: CURRENT_PROJECT_VERSION incremented to ${next}`);
  return next;
}

function bumpBuild(targetsArg) {
  const rootDir = path.resolve(__dirname, '..');
  const targets = Array.from(new Set(targetsArg.filter(t => VALID_TARGETS.has(t))));
  if (!targets.length) {
    throw new Error('No valid platform provided for build bump');
  }

  const result = {};
  for (const target of targets) {
    if (target === 'android') {
      result.android = bumpAndroid(rootDir);
    }
    if (target === 'ios') {
      result.ios = bumpIOS(rootDir);
    }
  }
  return result;
}

function runFromCli() {
  const arg = (process.argv[2] || 'both').toLowerCase();
  let targets;
  if (arg === 'both') {
    targets = ['android', 'ios'];
  } else if (VALID_TARGETS.has(arg)) {
    targets = [arg];
  } else {
    console.error('Unknown target: use "ios", "android" or "both".');
    process.exit(1);
  }
  try {
    bumpBuild(targets);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runFromCli();
}

module.exports = { bumpBuild };
