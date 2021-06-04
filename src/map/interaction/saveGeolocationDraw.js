import { wappStorage } from 'cordovapp/cordovapp/CordovApp'
import { messageDlg } from 'cordovapp/cordovapp/dialog'
import { Callbacks } from 'jquery';

const storageKey = 'WebApp@geolocationTrack';

/** Save geolocation and ask for restore if one is in the storage
 */
function saveGeolocationDraw(geoloc, cbak) {
  // Start a new track
  geoloc.on('drawstart', () => {
    // Get existing path in storage
    const path = wappStorage(storageKey);
    if (path) {
      messageDlg(
        'Une trace a étée interrompue, voulez-vous la continuer ?',
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
    wappStorage(storageKey, geoloc.path_);
  });

  // Save while drawing
  geoloc.on('tracking', () => {
    wappStorage(storageKey, geoloc.path_);
  });

  // Done
  geoloc.on('drawend', () => {
    wappStorage(storageKey, '');
  });
};

export default saveGeolocationDraw
