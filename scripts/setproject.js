const fs = require('fs');

// Load local env (or default .env)
const dotenv = require('dotenv')
dotenv.config({ path: "./.env.dist" });
dotenv.config({ path: "./.env", override: true });

console.log('\x1b[36m\x1b[1m\x1b[44m', '  APPLICATION >>>> ', process.env.APPLI, ' <<<<  \x1b[0m');

// Copy application files 
const fse = require('fs-extra');

// Remove / copy application files
fse.emptyDirSync('./src/appli')
fse.copySync('./scripts/' + process.env.APPLI, './src/appli', { overwrite: true });

fs.copyFileSync('./scripts/' + process.env.APPLI + '/logo.png', './src/assets/img/logo.png')

// Update config.xml
let xml = fs.readFileSync('./config.xml', 'utf8');
xml = xml.replace(/<name>(.*)<\/name>/, '<name>' + process.env.APPLI_NAME + '</name>')
xml = xml.replace(/<widget id="(.*)"/, '<widget id="' + process.env.APPLI_ID + '"')
fs.writeFileSync('./config.xml', xml);

/* OK */
console.log();