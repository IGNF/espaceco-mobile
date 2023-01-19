const fs = require('fs');

// Load local env (or default .env)
const dotenv = require('dotenv')
dotenv.config();
dotenv.config({ path: "./.env.local", override: true });

console.log('\x1b[32m\x1b[1m\x1b[44m', ' Watching >>>> ', process.env.APPLI, ' <<<<  \x1b[0m');

let tout = {};
fs.watch('./src/appli', { recursive: true }, (eventType, filename) => {
  clearTimeout(tout[filename])
  tout[filename] = setTimeout(() => {
    const dest = './scripts/' + process.env.APPLI + '/' + filename
    fs.copyFile('./src/appli/' + filename, dest, () => {})
    console.log('save >>>', filename)
  }, 100)
})
  