#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { bumpBuild } = require('./bump-build.js');

const VALID_TARGETS = new Set(['ios', 'android', 'both']);
const rootDir = path.resolve(__dirname, '..');

function run(cmd, options = {}) {
  execSync(cmd, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options,
  });
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
}

function ensureCleanGit() {
  const status = runCapture('git status --porcelain');
  if (status) {
    console.error('Working tree is not clean. Commit or stash changes before deployment.');
    process.exit(1);
  }
}

function ensureSelectedApp() {
  const file = path.join(rootDir, 'scripts', '.selected-app');
  if (!fs.existsSync(file)) {
    console.warn('scripts/.selected-app missing. CI will default to EspaceCo.');
    return;
  }
  const content = fs.readFileSync(file, 'utf8').trim();
  if (content !== 'EspaceCo' && content !== 'NaviForest') {
    console.warn(`Unexpected value in scripts/.selected-app (${content}). CI will default to EspaceCo.`);
  }
}

function stageChanges() {
  run('git add -u');
}

function createCommitMessage(targets) {
  if (targets.length === 2) return 'chore: bump build numbers';
  const label = targets[0] === 'ios' ? 'iOS' : 'Android';
  return `chore: bump ${label} build number`;
}

function generateTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
}

function generateTags(targets) {
  const ts = generateTimestamp();
  return targets.map((target) => `deploy/${target}/${ts}`);
}

function createTags(tags) {
  for (const tag of tags) {
    run(`git tag -a ${tag} -m "${tag}"`);
  }
}

function pushCommitAndTags(tags) {
  run('git push');
  for (const tag of tags) {
    run(`git push origin ${tag}`);
  }
}

function main() {
  const targetArg = (process.argv[2] || 'both').toLowerCase();
  if (!VALID_TARGETS.has(targetArg)) {
    console.error('Usage: npm run deploy[:ios|:android]');
    process.exit(1);
  }
  const targets = targetArg === 'both' ? ['android', 'ios'] : [targetArg];

  ensureCleanGit();
  ensureSelectedApp();

  try {
    bumpBuild(targets);
  } catch (err) {
    console.error(`Failed to bump build numbers: ${err.message}`);
    process.exit(1);
  }

  stageChanges();

  const commitMessage = createCommitMessage(targets);
  try {
    run(`git commit -m "${commitMessage}"`);
  } catch (err) {
    console.error('Failed to create commit (maybe no staged changes).');
    process.exit(1);
  }

  const tags = generateTags(targets);
  createTags(tags);
  pushCommitAndTags(tags);

  const branch = runCapture('git rev-parse --abbrev-ref HEAD');
  console.log('\nDeployment ready. The following tags have been pushed:');
  for (const tag of tags) {
    console.log(`  - ${tag}`);
  }
  console.log(`Commit pushed on ${branch}. CI/CD pipelines will pick up the tags automatically.`);
}

main();
