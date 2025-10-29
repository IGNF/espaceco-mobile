import { Capacitor } from '@capacitor/core'

// Helpers & constants
const CDV_HTTP_REGEX = /^https?:\/\/localhost\/__cdvfile_([^/]+)__\/(.+)/i
const CDVFILE_REGEX = /^cdvfile:\/\/localhost\/([^/]+)\/(.+)/i
const CAPACITOR_FILE_REGEX = /^(capacitor:\/\/localhost|https?:\/\/localhost)\/_capacitor_file_/i

function getCordovaFile() {
  return (typeof window !== 'undefined' && window.cordova && window.cordova.file) ? window.cordova.file : null
}

const FS_NAME_TO_PROP = {
  'files': 'dataDirectory',
  'files-external': 'externalDataDirectory',
  'cache': 'cacheDirectory',
  'cache-external': 'externalCacheDirectory',
  'documents': 'documentsDirectory',
  'sdcard': 'externalRootDirectory',
  'assets': 'applicationDirectory',
  'root': 'externalRootDirectory'
}

function resolveBaseFromFsName(fsName) {
  const cf = getCordovaFile()
  if (!cf) return null
  const prop = FS_NAME_TO_PROP[fsName]
  return prop ? (cf[prop] || null) : null
}

function ensureTrailingSlash(path) {
  return /\/$/.test(path) ? path : path + '/'
}

function convertWithCapacitor(fileUrl) {
  try {
    return Capacitor.convertFileSrc ? Capacitor.convertFileSrc(fileUrl) : fileUrl
  } catch (e) {
    console.warn('Capacitor.convertFileSrc failed:', e)
    return fileUrl
  }
}

// convertit une URL Cordova en une URL resolvable par Capacitor/qui s'affiche dans la webview
export function convertPhotoToDisplaySrc(photoPath) {
  if (typeof photoPath !== 'string' || !photoPath) {
    return '';
  }

  const cdvHttpMatch = CDV_HTTP_REGEX.exec(photoPath);
  if (cdvHttpMatch) {
    const fsName = cdvHttpMatch[1];
    const rest = cdvHttpMatch[2];
    try {
      const base = resolveBaseFromFsName(fsName);
      if (base) {
        const fileUrl = ensureTrailingSlash(base) + rest;
        const conv = convertWithCapacitor(fileUrl);
        return conv;
      }
      // Fallback
      photoPath = `cdvfile://localhost/${fsName}/${rest}`;
    } catch (e) {
      console.warn('Failed to map __cdvfile_ localhost URL:', e);
    }
  }

  const cdvMatch = CDVFILE_REGEX.exec(photoPath);
  if (cdvMatch) {
    const fsName = cdvMatch[1];
    const rest = cdvMatch[2];
    try {
      const base = resolveBaseFromFsName(fsName);
      if (base) {
        const fileUrl = ensureTrailingSlash(base) + rest;
        const conv = convertWithCapacitor(fileUrl);
        return conv;
      }
    } catch (e) {
      console.warn('Failed to map cdvfile URL:', e);
    }
  }

  // déjà une URL data ou HTTP(S)
  if (/^data:|^https?:/i.test(photoPath)) {
    return photoPath;
  }

  // si c'est une URL Capacitor, c'est ok
  if (CAPACITOR_FILE_REGEX.test(photoPath)) {
    return photoPath;
  }

  // si c'est une URL Cordova, convert via Capacitor
  if (/^(cdvfile:|content:|file:)/i.test(photoPath) || /__cdvfile_/i.test(photoPath)) {
    try {
      const newPath = convertWithCapacitor(photoPath);
      return newPath;
    } catch (e) {
      console.warn('Failed to convert URI with Capacitor:', e);
    }
  }
  
  // en cas d'URL type file/tmp/cache/asset/app, on essaye de la résoudre avec Cordova
  if (/^(FILE\/?|TMP\/?|CACHE\/?|ASSET\/?|APP\/?)/i.test(photoPath)) {
    try {
      const resolved = window.CordovApp && window.CordovApp.File && window.CordovApp.File.getFileURI
        ? window.CordovApp.File.getFileURI(photoPath)
        : photoPath;
      const conv = convertWithCapacitor(resolved);
      return conv;
    } catch (e) {
      console.warn('Failed to resolve/convert Cordova-style path:', e);
    }
  }

  // si c'est une URL relative ou autre format, on essaye de la résoudre avec CordovApp.File
  try {
    const newPath = window.CordovApp && window.CordovApp.File && window.CordovApp.File.getFileURI
      ? window.CordovApp.File.getFileURI(photoPath)
      : photoPath;
    if (/^(file:|content:)/i.test(newPath)) {
      const conv = convertWithCapacitor(newPath);
      return conv;
    }
    return newPath;
  } catch (e) {
    console.warn('Failed to get file URI with CordovApp.File:', e);
    return photoPath;
  }
}

export function isValidPhotoPath(photoPath) {
  if (typeof photoPath !== 'string' || !photoPath) {
    return false;
  }

  // formats valides: data URLs, HTTP(S) URLs, file URLs, ou non-empty strings
  return /^(data:|https?:|file:).+/i.test(photoPath) || photoPath.trim().length > 0;
}

export function processPhotoArray(photoPaths) {
  if (!Array.isArray(photoPaths)) {
    return [];
  }

  return photoPaths
    .filter(isValidPhotoPath)
    .map((photoPath, index) => ({
      index: index + 1,
      originalPath: photoPath,
      displaySrc: convertPhotoToDisplaySrc(photoPath)
    }))
    .filter(photo => photo.displaySrc);
}

// transforme une URL Cordova en une URL resolvable par Capacitor
export function toResolvableFileUri(photoPath) {
  if (typeof photoPath !== 'string' || !photoPath) return '';

  // déjà une URL file/content
  if (/^(file:|content:)/i.test(photoPath)) return photoPath;

  const cdvHttpMatch = CDV_HTTP_REGEX.exec(photoPath);
  // si c'est une URL Cordova
  if (cdvHttpMatch) {
    const fsName = cdvHttpMatch[1];
    const rest = cdvHttpMatch[2];
    const base = resolveBaseFromFsName(fsName);
    if (base) return ensureTrailingSlash(base) + rest;
    // fallback à une URL Cordova
    return `cdvfile://localhost/${fsName}/${rest}`;
  }

  // si c'est une URL Cordova (non http)
  const cdvMatch = CDVFILE_REGEX.exec(photoPath);
  if (cdvMatch) {
    const fsName = cdvMatch[1];
    const rest = cdvMatch[2];
    const base = resolveBaseFromFsName(fsName);
    if (base) return ensureTrailingSlash(base) + rest;
  }

  // autres (http(s) data URL, pseudo roots, etc.)
  return photoPath;
}
