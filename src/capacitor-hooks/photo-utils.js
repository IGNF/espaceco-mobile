import { Capacitor } from '@capacitor/core'

// function isAndroid() {
//   return typeof window !== 'undefined' &&
//     Capacitor.getPlatform &&
//     Capacitor.getPlatform() === 'android';
// }

/**
 * ios
 * [Log] convertPhotoToDisplaySrc – "file:///var/mobile/Containers/Data/Application/9C4BA0A0-5993-493A-99B3-CF2357AEC68C/Library/NoCloud/georem-2photo0.jpg" (index.b2bd7374.js, line 159831)
 * [Log] convertPhotoToDisplaySrc: file: (index.b2bd7374.js, line 159865)
"capacitor://localhost/_capacitor_file_/var/mobile/Containers/Data/Application/9C4BA0A0-5993-493A-99B3-CF2357AEC68C/Library/NoCloud/georem-2photo0.jpg" 
 */
export function convertPhotoToDisplaySrc(photoPath) {
  console.log('convertPhotoToDisplaySrc', photoPath);
  if (typeof photoPath !== 'string' || !photoPath) {
    return '';
  }

  // Already a data URL or HTTP(S) URL - use as is
  // if (/^data:|^https?:/i.test(photoPath) && !photoPath.includes('localhost')) {
  //   console.log('convertPhotoToDisplaySrc: data:', photoPath);
  //   return photoPath;
  // }

  // Check for problematic Android __cdvfile URLs and convert them properly
  // if (isAndroid() && /https?:\/\/localhost\/__cdvfile/.test(photoPath)) {
  //   console.warn('Detected problematic Android __cdvfile URL, attempting to fix:', photoPath);

  //   // Try to extract the filename and construct a proper file path
  //   const filenameMatch = photoPath.match(/([^/]+\.jpg)$/);
  //   if (filenameMatch) {
  //     const filename = filenameMatch[1];
  //     // Try to find this file in known locations
  //     const possiblePaths = [
  //       `file:///data/user/0/fr.ign.guichet/files/${filename}`,
  //       `file:///data/user/0/fr.ign.guichet/files/cache-signalements/${filename}`,
  //       `file:///android_asset/www/${filename}`
  //     ];

  //     // For now, try with Capacitor.convertFileSrc on the first possibility
  //     try {
  //       const reconstructedPath = possiblePaths[0];
  //       return Capacitor.convertFileSrc ? Capacitor.convertFileSrc(reconstructedPath) : reconstructedPath;
  //     } catch (e) {
  //       console.warn('Failed to convert reconstructed Android path:', e);
  //     }
  //   }
  // }

  // File:// URL - convert using Capacitor for mobile platforms
  if (/^file:/i.test(photoPath)) {
    console.log('matches');
    try {
      const newPath = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(photoPath) : photoPath;
      console.log('convertPhotoToDisplaySrc: file:', newPath);
      return newPath;
    } catch (e) {
      console.warn('Failed to convert file URL with Capacitor:', e);
      return photoPath;
    }
  }

  // if (isAndroid()) {
  //   console.warn('Android: Skipping CordovApp.File.getFileURI to avoid __cdvfile URLs');
  //   return photoPath;
  // }

  // Relative path or other format - try CordovApp.File method (non-Android only)
  try {
    const newPath = window.CordovApp.File.getFileURI(photoPath);
    console.log('convertPhotoToDisplaySrc: file:', newPath);
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

  // Valid formats: data URLs, HTTP(S) URLs, file URLs, or non-empty strings
  return /^(data:|https?:|file:).+/i.test(photoPath) || photoPath.trim().length > 0;
}

export function processPhotoArray(photoPaths) {
  if (!Array.isArray(photoPaths)) {
    return [];
  }

  return photoPaths
    .filter(isValidPhotoPath)
    .map((photoPath, index) => ({
      index: index + 1, // 1-based index for UI (img1, img2, etc.)
      originalPath: photoPath,
      displaySrc: convertPhotoToDisplaySrc(photoPath)
    }))
    .filter(photo => photo.displaySrc); // Only include photos with valid display sources
}
