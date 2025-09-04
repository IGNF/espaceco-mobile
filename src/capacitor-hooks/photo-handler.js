import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { convertPhotoToDisplaySrc } from './photo-utils'

export default function installReportPhotoCapacitor(wapp) {
  if (!wapp || !wapp.report) return;

  // Ensure folder exists (noop if already there)
  function ensureFolder() {
    return Filesystem.mkdir({
      path: 'cache-signalements',
      directory: Directory.Data,
      recursive: true
    }).catch(function(e) {
      console.error('Error creating folder', e);
    });
  }

  function pickNextEmptyImgSelector() {
    const ids = ['#img1', '#img2', '#img3', '#img4'];
    for (const id of ids) {
      const el = document.querySelector(id);
      if (el && !el.getAttribute('src')) return id;
    }
    return ids[0];
  }

  function takeAndStorePhoto() {
    return ensureFolder().then(function() {
      return Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        correctOrientation: true,
        saveToGallery: false
      });
    }).then(function(photo) {
      const fileName = `photo_${Date.now()}.jpeg`;
      const path = `cache-signalements/${fileName}`;
      return Filesystem.writeFile({
        path,
        data: photo.base64String,
        directory: Directory.Data
      }).then(function() {
        return Filesystem.getUri({ path, directory: Directory.Data });
      }).then(function(result) {
        const displaySrc = convertPhotoToDisplaySrc(result.uri);
        return { uri: result.uri, displaySrc };
      });
    });
  }

  // Pending photos for the current form session
  wapp.report._pendingPhotos = [];

  // Override cancel to clear pending state
  const _origCancel = wapp.report.cancelFormulaire && wapp.report.cancelFormulaire.bind(wapp.report);
  if (_origCancel) {
    wapp.report.cancelFormulaire = function(...args) {
      this._pendingPhotos = [];
      ['#img1', '#img2', '#img3', '#img4'].forEach(function(sel) {
        const el = document.querySelector(sel);
        if (el) {
          el.removeAttribute('src');
          el.style.display = 'none'; // Hide the image when clearing src
        }
      });
      return _origCancel(...args);
    }
  }

  // Override photo behavior used by onglet-signaler.html
  wapp.report.photo = function(_unused, selector) {
    takeAndStorePhoto().then(function(result) {
      const { uri, displaySrc } = result;
      console.log('uri', uri);
      console.log('displaySrc', displaySrc);
      const target = selector || pickNextEmptyImgSelector();
      console.log('target', target);
      const img = document.querySelector(target);
      console.log('img', img);
      // file:///data/user/0/fr.ign.guichet/files/cache-signalements/photo_1756972458552.jpeg
      if (img) {
        img.setAttribute('src', displaySrc);
        img.style.display = 'inline-block'; // Show the image when src is set
      }
      this._pendingPhotos = this._pendingPhotos || [];
      console.log('this._pendingPhotos', this._pendingPhotos);
      this._pendingPhotos.push(uri);
      console.log('this._pendingPhotos', this._pendingPhotos);
      
      // Reset iOS StatusBar configuration after successful photo capture
      if (window.initializeIOSStatusBar) {
        setTimeout(window.initializeIOSStatusBar, 100);
      }
    }.bind(this)).catch(function(e) {
      console.warn('Photo capture canceled or failed', e);
      
      // Reset iOS StatusBar configuration even when photo capture fails/is canceled
      if (window.initializeIOSStatusBar) {
        setTimeout(window.initializeIOSStatusBar, 100);
      }
    });
  }

  // Inject pending photos on save
  const _origSave = wapp.report.saveLocalRem && wapp.report.saveLocalRem.bind(wapp.report);
  if (_origSave) {
    wapp.report.saveLocalRem = function(georem, ...rest) {
      console.log("saveLocalRem", georem, this._pendingPhotos.length);
      if (this._pendingPhotos && this._pendingPhotos.length) {
        georem.photos = (georem.photos || []).concat(this._pendingPhotos);
        georem.photo = georem.photos.length > 0;
        georem.photosToSend = (georem.photosToSend || []).concat(this._pendingPhotos);
        this._pendingPhotos = [];
        console.log('georem', georem);
      }
      return _origSave(georem, ...rest);
    }
  }

  // Override the ReportForm's showGeorem method to fix Android photo display
  // const _origShowGeorem = wapp.report.showGeorem && wapp.report.showGeorem.bind(wapp.report);
  // if (_origShowGeorem) {
  //   wapp.report.showGeorem = function(georem) {
  //     const result = _origShowGeorem(georem);
      
  //     // After the original showGeorem runs, fix any problematic photo URLs
  //     setTimeout(function() {
  //       // Check both form element and any georem displays (like onglet-georem)
  //       const containers = [wapp.report.formElement, '#fiche .georem'];
        
  //       containers.forEach(container => {
  //         $(container).find('.photo img, img.photo').each(function() {
  //           const currentSrc = $(this).attr('src');
  //           if (currentSrc && /https?:\/\/localhost\/__cdvfile/.test(currentSrc)) {
  //             console.log('Fixing problematic photo URL:', currentSrc);
  //             const photoData = $(this).data('photo');
  //             if (photoData) {
  //               const fixedSrc = convertPhotoToDisplaySrc(photoData);
  //               console.log('Fixed photo URL from', currentSrc, 'to', fixedSrc);
  //               $(this).attr('src', fixedSrc);
  //             } else {
  //               // If no photo data, try to extract filename and reconstruct path
  //               const filenameMatch = currentSrc.match(/([^/]+\.jpg)$/);
  //               if (filenameMatch) {
  //                 const filename = filenameMatch[1];
  //                 console.log('Attempting to reconstruct path for filename:', filename);
  //                 // Try common photo locations
  //                 const possiblePaths = [
  //                   `file:///data/user/0/fr.ign.guichet/files/${filename}`,
  //                   `file:///data/user/0/fr.ign.guichet/files/cache-signalements/${filename}`
  //                 ];
                  
  //                 for (const path of possiblePaths) {
  //                   const fixedSrc = convertPhotoToDisplaySrc(path);
  //                   if (fixedSrc !== path) { // If conversion changed something, use it
  //                     console.log('Reconstructed photo URL:', fixedSrc);
  //                     $(this).attr('src', fixedSrc);
  //                     break;
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         });
  //       });
  //     }, 100);
      
  //     return result;
  //   };
  // }

  // // Also add a general photo URL fixer that can be triggered manually
  // wapp.fixPhotoPaths = function() {
  //   console.log('Manually fixing photo paths...');
  //   $('#fiche .georem img.photo, #fiche .georem .photo img').each(function() {
  //     const currentSrc = $(this).attr('src');
  //     if (currentSrc && /https?:\/\/localhost\/__cdvfile/.test(currentSrc)) {
  //       console.log('Found problematic photo URL:', currentSrc);
  //       const photoData = $(this).data('photo');
  //       if (photoData) {
  //         const fixedSrc = convertPhotoToDisplaySrc(photoData);
  //         console.log('Fixed using photo data:', fixedSrc);
  //         $(this).attr('src', fixedSrc);
  //       } else {
  //         const filenameMatch = currentSrc.match(/([^/]+\.jpg)$/);
  //         if (filenameMatch) {
  //           const filename = filenameMatch[1];
  //           const reconstructedPath = `file:///data/user/0/fr.ign.guichet/files/${filename}`;
  //           const fixedSrc = convertPhotoToDisplaySrc(reconstructedPath);
  //           console.log('Fixed using reconstructed path:', fixedSrc);
  //           $(this).attr('src', fixedSrc);
  //         }
  //       }
  //     }
  //   });
  // };

  // // Override wapp.showSelect to fix photos when showing georem details
  // const _origShowSelect = wapp.showSelect && wapp.showSelect.bind(wapp);
  // if (_origShowSelect) {
  //   wapp.showSelect = function(...args) {
  //     const result = _origShowSelect(...args);
      
  //     // After showing selection, fix any problematic photo URLs
  //     setTimeout(function() {
  //       wapp.fixPhotoPaths();
  //     }, 200);
      
  //     return result;
  //   };
  // }
}