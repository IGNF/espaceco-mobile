#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const app_names = {
  espaceco: 'EspaceCo',
  naviforest: 'NaviForest'
};

function parseArg(argv) {
  // Acceptés: --naviforest, --espaceco, naviforest, espaceco
  const raw = argv.slice(2).find(a => !!a) || ''; // récupère l'argument passé en paramètre
  const cleaned = raw.replace(/^--?/, '').toLowerCase();
  return app_names[cleaned] || null;
}

const selected = parseArg(process.argv);
if (!selected) {
  console.error('Usage: npm run selectapp -- --naviforest | --espaceco');
  process.exit(1);
}

// Stockage de la sélection dans scripts/.selected-app
const outFile = path.resolve(__dirname, '.selected-app');
fs.writeFileSync(outFile, selected + '\n', 'utf8');
console.log(`Successfully set selected app to: ${selected}`);
