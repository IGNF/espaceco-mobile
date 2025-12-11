#!/usr/bin/env node
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

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
const originDir = path.join(root, 'scripts', selected, 'assets');

// Définit les images (icon, splash, android-background, android-foreground) à utiliser pour la génération des assets natifs
const iconPath = path.join(resourcesDir, 'icon.png');
const splashPath = path.join(resourcesDir, 'splash.png');
const splashDarkPath = path.join(resourcesDir, 'splash-dark.png');
const androidBackgroundPath = path.join(resourcesDir, 'android', 'icon-background.png');
const androidForegroundPath = path.join(resourcesDir, 'android', 'icon-foreground.png');
try {
  if (fs.existsSync(iconPath)) {
    fse.copyFileSync(path.join(originDir, 'icon.png'), iconPath);
    console.log(`- Updated resources/icon.png from ${selected} icon`);
  } else {
    console.log('- Kept existing resources/icon.png');
  }
  if (fs.existsSync(splashPath)) {
    fse.copyFileSync(path.join(originDir, 'splash.png'), splashPath);
    console.log(`- Updated resources/splash.png from ${selected} splash`);
  } else {
    console.log('- Kept existing resources/splash.png');
  }
  if (fs.existsSync(splashDarkPath)) {
    fse.copyFileSync(path.join(originDir, 'splash-dark.png'), splashDarkPath);
    console.log(`- Updated resources/splash-dark.png from ${selected} splash-dark`);
  } else {
    console.log('- Kept existing resources/splash-dark.png');
  }
  if (fs.existsSync(androidBackgroundPath)) {
    fse.copyFileSync(path.join(originDir, 'android', 'icon-background.png'), androidBackgroundPath);
    console.log(`- Updated resources/android-background.png from ${selected} android-background`);
  } else {
    console.log('- Kept existing resources/android-background.png');
  }
  if (fs.existsSync(androidForegroundPath)) {
    fse.copyFileSync(path.join(originDir, 'android', 'icon-foreground.png'), androidForegroundPath);
    console.log(`- Updated resources/android-foreground.png from ${selected} android-foreground`);
  } else {
    console.log('- Kept existing resources/android-foreground.png');
  }

  // generate assets using capacitor
  execSync('npx @capacitor/assets generate --android', { stdio: 'inherit' });
  execSync('npx @capacitor/assets generate --ios', { stdio: 'inherit' });

} catch (e) {
  console.warn(`- Unable to update resources/icon.png: ${e.message}`);
}

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
      // Met à jour l'autorité FileProvider pour correspondre au package
      txt = txt.replace(/android:authorities="[^"]+\.fileprovider"/, `android:authorities="${androidPackage}.fileprovider"`);
      fs.writeFileSync(manifest, txt, 'utf8');
      console.log(`- Android: Updated manifest authorities with package (FileProvider: ${androidPackage}.fileprovider)`);
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

// 6) Renomme le répertoire de l'activité principale Android pour correspondre au package
try {
  if (androidPackage) {
    const javaBase = path.join(root, 'android', 'app', 'src', 'main', 'java');
    const newPkgPath = androidPackage.replace(/\./g, path.sep);
    const newActivityDir = path.join(javaBase, newPkgPath);
    const newActivityFile = path.join(newActivityDir, 'MainActivity.java');

    // Cherche le fichier MainActivity.java existant dans n'importe quel sous-répertoire
    let existingActivityFile = null;
    const findMainActivity = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findMainActivity(fullPath);
        } else if (entry.name === 'MainActivity.java') {
          existingActivityFile = fullPath;
        }
      }
    };
    findMainActivity(javaBase);

    if (existingActivityFile) {
      const existingDir = path.dirname(existingActivityFile);

      // Si le répertoire est différent, déplace le fichier
      if (existingDir !== newActivityDir) {
        // Lit le contenu et met à jour la déclaration de package
        let content = fs.readFileSync(existingActivityFile, 'utf8');
        content = content.replace(/^package\s+[^;]+;/m, `package ${androidPackage};`);

        // Crée le nouveau répertoire et écrit le fichier
        fse.ensureDirSync(newActivityDir);
        fs.writeFileSync(newActivityFile, content, 'utf8');
        console.log(`- Android: Moved MainActivity.java to ${path.relative(root, newActivityFile)}`);

        // Supprime l'ancien fichier et nettoie les répertoires vides
        fs.unlinkSync(existingActivityFile);
        let dirToClean = existingDir;
        while (dirToClean !== javaBase && dirToClean.startsWith(javaBase)) {
          const remaining = fs.readdirSync(dirToClean);
          if (remaining.length === 0) {
            fs.rmdirSync(dirToClean);
            dirToClean = path.dirname(dirToClean);
          } else {
            break;
          }
        }
      } else {
        // Même répertoire, met à jour seulement la déclaration de package si nécessaire
        let content = fs.readFileSync(existingActivityFile, 'utf8');
        const updatedContent = content.replace(/^package\s+[^;]+;/m, `package ${androidPackage};`);
        if (content !== updatedContent) {
          fs.writeFileSync(existingActivityFile, updatedContent, 'utf8');
          console.log(`- Android: Updated package declaration in MainActivity.java`);
        }
      }
    } else {
      console.warn('- Android: MainActivity.java not found, skipping activity path rename');
    }
  }
} catch (e) {
  console.warn('- Warning: unable to rename Android activity path:', e.message);
}

// 7) Synchronise la version de l'app à partir de la configuration (sans incrémenter les numéros de build)
try {
  const version = String(appCfg.versionNumber || '').trim();
  if (!version) throw new Error('No versionNumber defined in app config');

  // Android: synchronise versionName avec la config (sans modifier versionCode)
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let txt = fs.readFileSync(gradle, 'utf8');
    txt = txt.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
    fs.writeFileSync(gradle, txt, 'utf8');
    console.log(`- Android: versionName=${version} (build number unchanged)`);
  }

  // iOS: synchronise MARKETING_VERSION avec la config (sans modifier CURRENT_PROJECT_VERSION)
  const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(pbxproj)) {
    let txt = fs.readFileSync(pbxproj, 'utf8');
    txt = txt.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
    fs.writeFileSync(pbxproj, txt, 'utf8');
    console.log(`- iOS: MARKETING_VERSION=${version} (build number unchanged)`);
  }
} catch (e) {
  console.warn('- Warning: unable to sync versions/build numbers:', e.message);
}
