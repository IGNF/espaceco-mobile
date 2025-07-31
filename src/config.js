import appli from './appli/config.js'

/** Default Config */
const config = {
  // App version
  version: "3.0.5",

  // Geoportail APIkey
  apiKey: "2wd9sfsi5hews9yxcr95i6br",
  // API login/pwd
  auth: 'Z3VpY2hldDpFc3BhY2VDMDgwNjk=',

};

// Overwrite
Object.keys(appli).forEach(k => {
  config[k] = appli[k]
})

export default config