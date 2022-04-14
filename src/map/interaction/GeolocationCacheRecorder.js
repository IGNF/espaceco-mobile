import { wappStorage } from 'cordovapp/cordovapp/CordovApp'
import { messageDlg } from 'cordovapp/cordovapp/dialog'
import { Callbacks } from 'jquery';

const storageKeyDraw = 'geolocationDraw';
const storageKeyActiveState = 'geolocationActive';

class GeolocationCacheRecorder {
  /** Save geolocation and ask for restore if one is in the storage
  */
  static saveDraw(geoloc, cbak) {
    // Start a new track
    geoloc.on('drawstart', () => {
      // Get existing path in storage
      const path = wappStorage(storageKeyDraw);
      if (path && path.length>1) {
        messageDlg(
          'Une trace a été interrompue, voulez-vous la continuer&nbsp;?',
          'GSP',
          { ok: 'oui', cancel: 'non, merci' },
          (b) => {
            // Start with last path
            if (b==='ok') {
              if (cbak) cbak();
              geoloc.path_ = path;
              geoloc.pause(false);
            }
          }
        );
      }
      // Start traking
      wappStorage(storageKeyDraw, geoloc.path_);
    });
  
    // Save while drawing
    geoloc.on('tracking', () => {
      wappStorage(storageKeyDraw, geoloc.path_);
    });
  
    // Done
    geoloc.on('drawend', () => {
      wappStorage(storageKeyDraw, '');
    });
  }

  static saveActiveState(geoloc) {
    // Get existing path in storage
    const path = wappStorage(storageKeyActiveState);
    if (path && "true" == path) {
      geoloc.setActive(true);
      geoloc.pause(true);
    } else {
      geoloc.setActive(false)
    }

    geoloc.on('change:active', (e) => {
      let active = typeof e.target.getActive() != "undefined" ? e.target.getActive() : true;
      wappStorage(storageKeyActiveState, active.toString());
    });
  }
}

export default GeolocationCacheRecorder
