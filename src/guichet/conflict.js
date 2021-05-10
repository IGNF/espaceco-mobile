import { toLonLat } from 'ol/proj';
import wapp from '../wapp'

wapp.ready(() => {
  $('#conflicts .object .fa-eye').on('click', () => {
    $('#conflicts .object').toggleClass('showall');
  })
})

/** Show conflicts
 * @param {ol.Feature} f
 * @param {any} conflict list of attributes
 */
function showFeatureInfo(li, f, conflict) {
  const updates = f.getUpdates();
  const p = $('#conflicts .object').addClass('visible');
  const ul = $('ul', p).html('');
  $('[data-role="dialogBt"]', p).off();
  $('.cancel', p).click(() => p.removeClass('visible'));
  $('.force', p).click(() => {
    li.removeClass();
    li.addClass('force');
    p.removeClass('visible');
  });
  $('.suppr', p).click(() => {
    li.removeClass();
    li.addClass('suppr');
    p.removeClass('visible');
  });
  $('.signal', p).click(() => {
    li.removeClass();
    li.addClass('signal');
    p.removeClass('visible');
  });
  // Show attributes
  if (f) {
    for (let att in f.getProperties()) {
      if (att !== 'gcms_fingerprint' && att !== 'geometry') { // && f.get(att) !== conflict[att]) 
        $('<li>')
          .html(att+':'+f.get(att)+' - '+conflict[att])
          .addClass(f.get(att) === conflict[att] ? 'same' : (f.get(att) != conflict[att] ? 'different' : 'equal' ))
          .addClass(Object.prototype.hasOwnProperty.call(updates,att) ? 'update' : 'same noupdate')
          .appendTo(ul);
      }
    }
  }
}

/** Save conflict 
 * @param {Element} conflict list
 * @param {ol.layer.Webpart} layer
 * @param {string} theme
 */
function saveConflicts(ul, layer, group, theme) {
  $('li', ul).each(function() {
    const li = $(this);
    const feature = li.data('feature');
    const conflict = li.data('conflict');
    switch (this.className) {
      // Forcer la modif
      case 'force': {
        feature.set('gcms_fingerprint', conflict.server_object['gcms_fingerprint'])
        break;
      }
      // Supprimer la modif
      case 'suppr': {
        layer.getSource().removeFeatureUpdate(feature);
        break;
      }
      // Creer un signalement
      case 'signal': {
        layer.getSource().removeFeatureUpdate(feature);
        var proj = wapp.map.getView().getProjection();
        var lonlat = toLonLat(feature.getGeometry().getFirstCoordinate(), proj);
        var grem =  {
          lon: lonlat[0], 
          lat: lonlat[1], 
          sketch: wapp.ripart.feature2sketch(feature, proj),
          comment: feature.getState(),
          id_groupe: wapp.ripart.param.profil.id_groupe,
          theme: theme,
          themes: '"'+group+'::'+theme+'"=>"1"'
        }
        wapp.ripart.saveLocalRem(grem);
        break;
      }
    }
  })
  wapp.hidePage();
  // UPdate ripart
  wapp.ripart.saveParam();
  // Update layer
  layer.getSource().writeChanges();
  layer.getSource().reload();
}

/** Show conflict page
 * @param {ol.layer.Webpart} layer
 * @param {Array<any>} conflicts
 */
function showConflicts(layer, conflicts) {
  const ftype = layer.getFeatureType();
  const ul = $('#conflicts .content ul').html('');
  let theme = null;
  $('#conflicts .content .theme').off()
    .html('Thème...')
    .on('click', () => {
      const choix = {};
      wapp.ripart.param.themes.forEach((t) => {
        choix[t.id_groupe+'::'+t.nom] = t.nom;
      })
      wapp.selectDialog(choix, theme, (rep)=> {
        theme = rep;
        $('#conflicts .content .theme').html(('Thème : '+rep.split('::')[1]));
      })
    });
  $('#conflicts .content .valid').off()
    .on('click', () => {
      if ($('.signal', ul).length && !theme) {
        wapp.alert('Sélectionnez un thème pour les signalements...');
        return;
      } 
      const thgroupe = (theme||'').split('::')
      saveConflicts(ul, layer, thgroupe[0], thgroupe[1]);
    })
  const features = layer.getSource().getFeatureUpdate() /*debug*/ || layer.getSource().getFeatures();
  conflicts.forEach((c) => {
    const id = c.server_object[ftype.idName];
    var f;
    for (let i=0; f = features[i]; i++) {
      if (f.get(ftype.idName)===id) {
        break;
      }
    }
    var li = $('<li>').text(ftype.idName + ': ' + id)
      .data('feature', f)
      .data('conflict', c)
      .click(() => {
        if (f) {
          showFeatureInfo(li, f, c.server_object);
        } else {
          wapp.alert('Impossible d\'accéder à l\'objet sur la carte...')
        }
      })
      .appendTo(ul);
  })
  wapp.showPage('conflicts');
}

/** Handle conflicts
 * @param {string} url conflict url
 * @param {ol.layer.Webpart} layer
 */
wapp.handleConflict = function(url, layer) {
  $.ajax({
    url: url + '.json',
    beforeSend: (xhr) => { 
      xhr.setRequestHeader("Authorization", "Basic " + wapp.ripart.getHash()); 
      xhr.setRequestHeader("Accept-Language", null);
    },
    success: (resp) => {
      const conflicts = resp.conflicts;
      wapp.message(
        'Détection de '+conflicts.length+' conflit(s)...', 
        'Conflits', 
        { ok:'Traiter les conflits', cancel:'Annuler' },
        (b) => {
          if (b === 'ok') {
            showConflicts(layer, conflicts);
          }
        }
      );
      console.log(layer, resp)
    },
    error: () => {
      wapp.alert('')
    }
  })
};