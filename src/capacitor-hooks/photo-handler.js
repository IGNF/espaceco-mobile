import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { convertPhotoToDisplaySrc } from './photo-utils'

export default function installReportPhotoCapacitor(wapp) {
  if (!wapp || !wapp.report) return;

  // s'assure que le dossier local existe (pour stocker les photos)
  function ensureFolder() {
    return Filesystem.mkdir({
      path: 'cache-signalements',
      directory: Directory.Data,
      recursive: true
    }).catch(function (e) {
      console.error('Error creating folder', e);
      // existe déjà
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
    return ensureFolder().then(function () {
      return Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        correctOrientation: true,
        saveToGallery: false
      });
    }).then(function (photo) {
      const fileName = `photo_${Date.now()}.jpeg`;
      const path = `cache-signalements/${fileName}`;
      return Filesystem.writeFile({
        path,
        data: photo.base64String,
        directory: Directory.Data
      }).then(function () {
        return Filesystem.getUri({ path, directory: Directory.Data });
      }).then(function (result) {
        const displaySrc = convertPhotoToDisplaySrc(result.uri);
        return { uri: result.uri, displaySrc };
      });
    });
  }

  // Photos en attente pour la session courante
  wapp.report._pendingPhotos = [];

  // Surcharge de cancelFormulaire pour nettoyer les photos en attente
  const _origCancel = wapp.report.cancelFormulaire && wapp.report.cancelFormulaire.bind(wapp.report);
  if (_origCancel) {
    wapp.report.cancelFormulaire = function (...args) {
      this._pendingPhotos = [];
      ['#img1', '#img2', '#img3', '#img4'].forEach(function (sel) {
        const el = document.querySelector(sel);
        if (el) {
          el.removeAttribute('src');
          el.style.display = 'none'; // masquer l'image lorsque le src est nettoyé
        }
      });
      return _origCancel(...args);
    }
  }

  // Surcharge du comportement de photo utilisé par onglet-signaler.html
  wapp.report.photo = function (_unused, selector) {
    takeAndStorePhoto().then(function (result) {
      const { uri, displaySrc } = result;
      const target = selector || pickNextEmptyImgSelector();
      const img = document.querySelector(target);
      if (img) {
        img.setAttribute('src', displaySrc);
        img.style.display = 'inline-block';
      }
      this._pendingPhotos = this._pendingPhotos || [];
      this._pendingPhotos.push(uri);

      // La status bar iOS a parfois un bug d'affichage lorsqu'on ferme l'appareil photo
      // on la réinitialise donc
      if (window.initializeIOSStatusBar) {
        setTimeout(window.initializeIOSStatusBar, 100);
      }
    }.bind(this)).catch(function (e) {
      console.warn('Photo capture canceled or failed', e);

      if (window.initializeIOSStatusBar) {
        setTimeout(window.initializeIOSStatusBar, 100);
      }
    });
  }

  // Surcharge de saveLocalRem pour injecter les photos en attente
  const _origSave = wapp.report.saveLocalRem && wapp.report.saveLocalRem.bind(wapp.report);
  if (_origSave) {
    wapp.report.saveLocalRem = function (georem, ...rest) {
      if (this._pendingPhotos && this._pendingPhotos.length) {
        georem.photos = (georem.photos || []).concat(this._pendingPhotos);
        georem.photo = georem.photos.length > 0;
        georem.photosToSend = (georem.photosToSend || []).concat(this._pendingPhotos);
        this._pendingPhotos = [];
      }
      return _origSave(georem, ...rest);
    }
  }

}