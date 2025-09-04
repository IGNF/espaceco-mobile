import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'

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
        const displaySrc = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(result.uri) : `data:image/jpeg;base64,${photo.base64String}`;
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
}