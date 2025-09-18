#!/usr/bin/env node
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
let selectionFile = path.join(root, 'scripts', '.selected-app');

/**
 * Lit le fichier contenant le nom de l'app selectionnée et le retourne
 * @returns {string} le nom de l'app selectionnée
 */
function readSelection() {
  try {
    const val = fs.readFileSync(selectionFile, 'utf8').trim();
    if (val === 'EspaceCo' || val === 'NaviForest') return val;
  } catch (e) {
    console.log("error in readSelection", e);
  }
  console.warn('No app selected, using default: EspaceCo');
  return 'EspaceCo';
}

const selected = readSelection();
console.log(`Preparing app for: ${selected}`);

/**
 * Charge la configuration de l'app selectionnée à partir du fichier config.js
 * @param {string} selectedName le nom de l'app selectionnée
 * @returns {Object} la configuration de l'app selectionnée
 */
function loadAppConfig(selectedName) {
  const cfgPath = path.join(root, 'scripts', selectedName, 'config.js');
  const code = fs.readFileSync(cfgPath, 'utf8');
  const exportIdx = code.indexOf('export default');
  if (exportIdx === -1) throw new Error('export default not found in config file ');
  const after = code.slice(exportIdx);
  const braceStart = after.indexOf('{');
  if (braceStart === -1) throw new Error('Config object not found in config file ');
  let i = braceStart;
  let depth = 0;
  let end = -1;
  // Trouve la fin de l'objet config
  while (i < after.length) {
    const ch = after[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
    i++;
  }
  if (end === -1) throw new Error('Malformed config object');
  const objCode = after.slice(braceStart, end + 1);

  // Supprime les commentaires
  const stripped = objCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const script = `(${stripped})`;
  const sandbox = {};
  const result = vm.runInNewContext(script, sandbox, { filename: cfgPath });
  return result;
}

const appCfg = loadAppConfig(selected);
const displayName = appCfg.displayName || appCfg.appli || selected;
const iosBundleId = appCfg.ios && appCfg.ios.bundleId ? String(appCfg.ios.bundleId) : undefined;
const androidPackage = appCfg.android && appCfg.android.packageName ? String(appCfg.android.packageName) : undefined;

// 1) Copie les fichiers spécifiques de l'app selectionnée dans le répertoire src/appli
const srcAppliDir = path.join(root, 'src', 'appli');
const appSourceDir = path.join(root, 'scripts', selected);
fse.ensureDirSync(srcAppliDir);
fse.emptyDirSync(srcAppliDir);
fse.copySync(appSourceDir, srcAppliDir, { overwrite: true, errorOnExist: false });

// 2) Copie le logo de l'app selectionnée dans le répertoire src/assets/img
const logoSrc = path.join(appSourceDir, 'logo.png');
const logoDest = path.join(root, 'src', 'assets', 'img', 'logo.png');
try {
  if (fs.existsSync(logoSrc)) {
    fse.ensureDirSync(path.dirname(logoDest));
    fse.copyFileSync(logoSrc, logoDest);
    console.log(`- Copied logo to ${path.relative(root, logoDest)}`);
  } else {
    console.warn(`- No logo found at ${path.relative(root, logoSrc)}; skipping app logo copy`);
  }
} catch (e) {
  console.warn(`- Unable to copy app logo: ${e.message}`);
}

// 3) Met à jour la configuration de Capacitor avec le nom de l'app selectionnée et l'identifiant de l'app (si les deux plateformes utilisent le même identifiant)
const capConfigPath = path.join(root, 'capacitor.config.json');
try {
  const raw = fs.readFileSync(capConfigPath, 'utf8');
  const json = JSON.parse(raw);
  // Si les deux plateformes utilisent le même bundle id, conserve appId en sync; sinon met à jour appName ici
  if (iosBundleId && androidPackage && iosBundleId === androidPackage) {
    json.appId = iosBundleId;
  }

  if (displayName) json.appName = displayName;
  fs.writeFileSync(capConfigPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`- Updated capacitor.config.json (appId=${json.appId}, appName=${json.appName})`);
} catch (e) {
  console.warn('- Warning: unable to update capacitor.config.json:', e.message);
}

// 4) Prépare les entrées pour @capacitor/assets
// TODO : ajouter la gestion des assets splash et android background/foreground
const resourcesDir = path.join(root, 'resources');
fse.ensureDirSync(resourcesDir);

// Utilise le logo de l'app selectionnée comme base icon si possible
const iconPath = path.join(resourcesDir, 'icon.png');
try {
  if (fs.existsSync(logoSrc)) {
    fse.copyFileSync(logoSrc, iconPath);
    console.log(`- Updated resources/icon.png from ${selected} logo`);
  } else {
    console.log('- Kept existing resources/icon.png');
  }
} catch (e) {
  console.warn(`- Unable to update resources/icon.png: ${e.message}`);
}

// On ne génère pas les assets ici, on le fait dans la CI avec la commande :
//    `npx @capacitor/assets generate`
console.log('Preparation complete.');

// 5) Applique les identifiants et les noms directement dans les projets natifs pour assurer la correction
try {
  // iOS: met à jour PRODUCT_BUNDLE_IDENTIFIER et display name
  if (iosBundleId) {
    const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
    if (fs.existsSync(pbxproj)) {
      let txt = fs.readFileSync(pbxproj, 'utf8');
      txt = txt.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${iosBundleId};`);
      fs.writeFileSync(pbxproj, txt, 'utf8');
      console.log(`- iOS: Set PRODUCT_BUNDLE_IDENTIFIER to ${iosBundleId}`);
    }
  }
  const iosInfo = path.join(root, 'ios', 'App', 'App', 'Info.plist');
  if (fs.existsSync(iosInfo) && displayName) {
    let txt = fs.readFileSync(iosInfo, 'utf8');
    // Remplace la valeur de CFBundleDisplayName
    txt = txt.replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleDisplayName<\/key>\n\t<string>${displayName}<\/string>`);
    fs.writeFileSync(iosInfo, txt, 'utf8');
    console.log(`- iOS: Set CFBundleDisplayName to ${displayName}`);
  }

  // Android: met à jour applicationId, namespace et app_name strings
  if (androidPackage) {
    const gradle = path.join(root, 'android', 'app', 'build.gradle');
    if (fs.existsSync(gradle)) {
      let txt = fs.readFileSync(gradle, 'utf8');
      txt = txt.replace(/applicationId\s+"[^"]+"/, `applicationId "${androidPackage}"`);
      txt = txt.replace(/namespace\s+"[^"]+"/, `namespace "${androidPackage}"`);
      fs.writeFileSync(gradle, txt, 'utf8');
      console.log(`- Android: Set applicationId/namespace to ${androidPackage}`);
    }

    // Met à jour les autorités AndroidManifest si présentes
    const manifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifest)) {
      let txt = fs.readFileSync(manifest, 'utf8');
      txt = txt.replace(/\$\{applicationId\}/g, androidPackage);
      fs.writeFileSync(manifest, txt, 'utf8');
      console.log('- Android: Updated manifest authorities with package');
    }

    // Met à jour strings.xml: app_name, title_activity_main, package_name, custom_url_scheme
    const stringsXml = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    if (fs.existsSync(stringsXml)) {
      let txt = fs.readFileSync(stringsXml, 'utf8');
      if (displayName) {
        txt = txt.replace(/<string name=\"app_name\">[^<]*<\/string>/, `<string name=\"app_name\">${displayName}<\/string>`);
        txt = txt.replace(/<string name=\"title_activity_main\">[^<]*<\/string>/, `<string name=\"title_activity_main\">${displayName}<\/string>`);
      }
      txt = txt.replace(/<string name=\"package_name\">[^<]*<\/string>/, `<string name=\"package_name\">${androidPackage}<\/string>`);
      txt = txt.replace(/<string name=\"custom_url_scheme\">[^<]*<\/string>/, `<string name=\"custom_url_scheme\">${androidPackage}<\/string>`);
      fs.writeFileSync(stringsXml, txt, 'utf8');
      console.log('- Android: Updated strings.xml with app name and package');
    }
  }
} catch (e) {
  console.warn('- Warning: unable to fully update native project files:', e.message);
}

// 6) Synchronise la version de l'app à partir de package.json et incrémente les numéros de build natifs si demandé
// Note : le numéro de build n'est pas incrémenté si on ne fait qu'un simple npm start (il faut lancer un build pour incrémenter le numéro de build)
try {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = String(pkg.version || '').trim();
  if (!version) throw new Error('No version found in package.json');
  const bumpBuild = process.argv.includes('--bump-build');

  // Android: set versionName et incrémente versionCode
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let txt = fs.readFileSync(gradle, 'utf8');
    // Met à jour versionName
    txt = txt.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
    if (bumpBuild) {
      // Incrémente versionCode (utilise max+1 si multiple occurrences)
      const codes = Array.from(txt.matchAll(/versionCode\s+(\d+)/g)).map(m => parseInt(m[1], 10));
      if (codes.length) {
        const next = Math.max(...codes) + 1;
        txt = txt.replace(/versionCode\s+\d+/g, `versionCode ${next}`);
        fs.writeFileSync(gradle, txt, 'utf8');
        console.log(`- Android: versionName=${version}, versionCode=${next}`);
      } else {
        fs.writeFileSync(gradle, txt, 'utf8');
        console.log(`- Android: versionName=${version} (no versionCode found)`);
      }
    } else {
      fs.writeFileSync(gradle, txt, 'utf8');
      console.log(`- Android: versionName=${version} (build number inchangé)`);
    }
  }

  // iOS: set MARKETING_VERSION et incrémente CURRENT_PROJECT_VERSION dans project.pbxproj
  const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(pbxproj)) {
    let txt = fs.readFileSync(pbxproj, 'utf8');
    // Met à jour MARKETING_VERSION
    txt = txt.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
    if (bumpBuild) {
      // Incrémente CURRENT_PROJECT_VERSION
      const matches = Array.from(txt.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g));
      if (matches.length) {
        const maxCur = Math.max(...matches.map(m => parseInt(m[1], 10)));
        const next = maxCur + 1;
        txt = txt.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${next};`);
        fs.writeFileSync(pbxproj, txt, 'utf8');
        console.log(`- iOS: MARKETING_VERSION=${version}, CURRENT_PROJECT_VERSION=${next}`);
      } else {
        fs.writeFileSync(pbxproj, txt, 'utf8');
        console.log(`- iOS: MARKETING_VERSION=${version} (no CURRENT_PROJECT_VERSION found)`);
      }
    } else {
      fs.writeFileSync(pbxproj, txt, 'utf8');
      console.log(`- iOS: MARKETING_VERSION=${version} (build number inchangé)`);
    }
  }
} catch (e) {
  console.warn('- Warning: unable to sync versions/build numbers:', e.message);
}
