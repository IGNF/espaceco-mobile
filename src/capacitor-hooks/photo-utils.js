import { Capacitor } from '@capacitor/core'

// convertit une URL Cordova en une URL resolvable par Capacitor/qui s'affiche dans la webview
export function convertPhotoToDisplaySrc(photoPath) {
  if (typeof photoPath !== 'string' || !photoPath) {
    return '';
  }

  const cdvHttpMatch = /^https?:\/\/localhost\/__cdvfile_([^/]+)__\/(.+)/i.exec(photoPath);
  if (cdvHttpMatch) {
    const fsName = cdvHttpMatch[1];
    const rest = cdvHttpMatch[2];
    try {
      const base = (function mapFsNameToBase() {
        const cf = (typeof window !== 'undefined' && window.cordova && window.cordova.file) ? window.cordova.file : null;
        if (!cf) return null;
        switch (fsName) {
          case 'files': return cf.dataDirectory || null;
          case 'files-external': return cf.externalDataDirectory || null;
          case 'cache': return cf.cacheDirectory || null;
          case 'cache-external': return cf.externalCacheDirectory || null;
          case 'documents': return cf.documentsDirectory || null;
          case 'sdcard': return cf.externalRootDirectory || null;
          case 'assets': return cf.applicationDirectory || null;
          case 'root': return cf.externalRootDirectory || null;
          default: return null;
        }
      })();
      if (base) {
        const fileUrl = base.replace(/\/$/, '/') + rest;
        const conv = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(fileUrl) : fileUrl;
        return conv;
      }
      // Fallback
      photoPath = `cdvfile://localhost/${fsName}/${rest}`;
    } catch (e) {
      console.warn('Failed to map __cdvfile_ localhost URL:', e);
    }
  }

  const cdvMatch = /^cdvfile:\/\/localhost\/([^/]+)\/(.+)/i.exec(photoPath);
  if (cdvMatch) {
    const fsName = cdvMatch[1];
    const rest = cdvMatch[2];
    try {
      const cf = (typeof window !== 'undefined' && window.cordova && window.cordova.file) ? window.cordova.file : null;
      let base = null;
      if (cf) {
        switch (fsName) {
          case 'files': base = cf.dataDirectory; break;
          case 'files-external': base = cf.externalDataDirectory; break;
          case 'cache': base = cf.cacheDirectory; break;
          case 'cache-external': base = cf.externalCacheDirectory; break;
          case 'documents': base = cf.documentsDirectory; break;
          case 'sdcard': base = cf.externalRootDirectory; break;
          case 'assets': base = cf.applicationDirectory; break;
          case 'root': base = cf.externalRootDirectory; break;
        }
      }
      if (base) {
        const fileUrl = base.replace(/\/$/, '/') + rest;
        const conv = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(fileUrl) : fileUrl;
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
  if (/^(capacitor:\/\/localhost|https?:\/\/localhost)\/_capacitor_file_/i.test(photoPath)) {
    return photoPath;
  }

  // si c'est une URL Cordova, convert via Capacitor
  if (/^(cdvfile:|content:|file:)/i.test(photoPath) || /__cdvfile_/i.test(photoPath)) {
    try {
      const newPath = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(photoPath) : photoPath;
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
      const conv = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(resolved) : resolved;
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
      const conv = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(newPath) : newPath;
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

  const cdvHttpMatch = /^https?:\/\/localhost\/__cdvfile_([^/]+)__\/(.+)/i.exec(photoPath);
  // si c'est une URL Cordova
  if (cdvHttpMatch) {
    const fsName = cdvHttpMatch[1];
    const rest = cdvHttpMatch[2];
    const cf = (typeof window !== 'undefined' && window.cordova && window.cordova.file) ? window.cordova.file : null;
    if (cf) {
      let base = null;
      switch (fsName) {
        case 'files': base = cf.dataDirectory; break;
        case 'files-external': base = cf.externalDataDirectory; break;
        case 'cache': base = cf.cacheDirectory; break;
        case 'cache-external': base = cf.externalCacheDirectory; break;
        case 'documents': base = cf.documentsDirectory; break;
        case 'sdcard': base = cf.externalRootDirectory; break;
        case 'assets': base = cf.applicationDirectory; break;
        case 'root': base = cf.externalRootDirectory; break;
      }
      if (base) return base.replace(/\/$/, '/') + rest;
    }
    // fallback à une URL Cordova
    return `cdvfile://localhost/${fsName}/${rest}`;
  }

  // si c'est une URL Cordova (non http)
  const cdvMatch = /^cdvfile:\/\/localhost\/([^/]+)\/(.+)/i.exec(photoPath);
  if (cdvMatch) {
    const fsName = cdvMatch[1];
    const rest = cdvMatch[2];
    const cf = (typeof window !== 'undefined' && window.cordova && window.cordova.file) ? window.cordova.file : null;
    if (cf) {
      let base = null;
      switch (fsName) {
        case 'files': base = cf.dataDirectory; break;
        case 'files-external': base = cf.externalDataDirectory; break;
        case 'cache': base = cf.cacheDirectory; break;
        case 'cache-external': base = cf.externalCacheDirectory; break;
        case 'documents': base = cf.documentsDirectory; break;
        case 'sdcard': base = cf.externalRootDirectory; break;
        case 'assets': base = cf.applicationDirectory; break;
        case 'root': base = cf.externalRootDirectory; break;
      }
      if (base) return base.replace(/\/$/, '/') + rest;
    }
  }

  // autres (http(s) data URL, pseudo roots, etc.)
  return photoPath;
}
