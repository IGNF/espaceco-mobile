import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'

export default function installReportPhotoCapacitor(wapp) {
  if (!wapp || !wapp.report) return;

  // Ensure folder exists (noop if already there)
  async function ensureFolder() {
    try {
      await Filesystem.mkdir({
        path: 'cache-signalements',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // ignore if EEXIST or unsupported
    }
  }

  function pickNextEmptyImgSelector() {
    const ids = ['#img1', '#img2', '#img3', '#img4'];
    for (const id of ids) {
      const el = document.querySelector(id);
      if (el && !el.getAttribute('src')) return id;
    }
    return ids[0];
  }

  async function takeAndStorePhoto() {
    await ensureFolder();
    const photo = await Camera.getPhoto({
      quality: 70,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      correctOrientation: true,
      saveToGallery: false
    });
    const fileName = `photo_${Date.now()}.jpeg`;
    const path = `cache-signalements/${fileName}`;
    await Filesystem.writeFile({
      path,
      data: photo.base64String,
      directory: Directory.Data
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
    const displaySrc = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(uri) : `data:image/jpeg;base64,${photo.base64String}`;
    return { uri, displaySrc };
  }

  // Pending photos for the current form session
  wapp.report._pendingPhotos = [];

  // Override cancel to clear pending state
  const _origCancel = wapp.report.cancelFormulaire && wapp.report.cancelFormulaire.bind(wapp.report);
  if (_origCancel) {
    wapp.report.cancelFormulaire = function(...args) {
      this._pendingPhotos = [];
      ['#img1', '#img2', '#img3', '#img4'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.removeAttribute('src');
      });
      return _origCancel(...args);
    }
  }

  // Override photo behavior used by onglet-signaler.html
  wapp.report.photo = async function(_unused, selector) {
    try {
      const { uri, displaySrc } = await takeAndStorePhoto();
      const target = selector || pickNextEmptyImgSelector();
      const img = document.querySelector(target);
      if (img) img.setAttribute('src', displaySrc);
      this._pendingPhotos = this._pendingPhotos || [];
      this._pendingPhotos.push(uri);
    } catch (e) {
      console.warn('Photo capture canceled or failed', e);
    }
  }

  // Inject pending photos on save
  const _origSave = wapp.report.saveLocalRem && wapp.report.saveLocalRem.bind(wapp.report);
  if (_origSave) {
    wapp.report.saveLocalRem = function(georem, ...rest) {
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

