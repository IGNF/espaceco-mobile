/* Gestion des guichets
*/
import ol_layer_Vector_WFS from 'cordovapp/ol/layer/WFS'
import { messageDlg } from 'cordovapp/cordovapp/dialog'

import wapp from '../wapp'
import CordovApp from 'cordovapp/CordovApp'
import setGeoportailLayers from '../map/layer/geoportail'
import './layer'
import './edition'
import './conflict'
import './fiche'
import { prettifyAxiosError } from 'cordovapp/collaboratif/errorHelper'

let template = null;
let saveLayers = function(layers) {
  const l = layers.pop();
  if (l) {
    if (typeof(l.getSource().nbModifications) == 'function' && l.getSource().nbModifications() > 0) {
      wapp.wait('Sauvegarde des modifications...<br/>'+l.get('title'));
      l.getSource().save(()=>{
        wapp.notification(l.get('title')+' sauvegardé...');
        // Next
        saveLayers(layers);
      }, (error, transaction) => {
        wapp.wait(false);
        // Look for transaction
        console.log('ERROR', error, transaction)
        if (transaction) {
          wapp.handleConflict(transaction, l);
        } else {
          let prettyError = prettifyAxiosError(error);
          wapp.alert('Impossible de sauvegarder '+l.get('title')+'<br/><i class="error">'+prettyError.message+'</i>');
        }
      });
    } else {
      saveLayers(layers);
    }
  } else {
    wapp.wait(false);
    wapp.hidePage();
  }
} 

/** Recherche des layers offline du groupe
 * @param {*} groupe
 */
wapp.getCache = function (groupe) {
  const info = {
    auth: false,
    cache: null
  }
  if (groupe && groupe.layers) {
    const cache = wapp.param.vectorCache;
    groupe.layers.forEach((l) => {
      if (l.type==='feature-type') {
        // Has authentication ?
        info.auth = info.auth || l.username; 
        // Hors ligne ?
        cache.forEach(c => {
          if (c.id_guichet === groupe.id) {
            info.cache = c;
          }
        });
      }
    });
  }
  return info;
};

/** Show guichet information dialogue
 * @param {*} groupe
 */
wapp.dialogInfoGuichet = function (groupe) {
  if (!groupe) {
    let groupId = wapp.userManager.param.active_community;
    groupe = wapp.userManager.getGroupById(groupId);
  }
  if (!groupe.layers) {
    wapp.showDialog('dialog-info-guichets');
    return;
  }

  const infoCache = wapp.getCache(groupe);

  /// Dialogue
  var page = CordovApp.template("dialog-infoguichet");
  wapp.dialog.show (page, {
    className: 'infoguichet',
    buttons: { submit:"OK"},
  });

  wapp.vectorCache.setCurrentGuichet(groupe);
  // Logo
  $('img', page).hide();
  wapp.getLogo(groupe, function(src) {
    $('img', page).attr('src',src).show();
  });
  // Nom, description
  var ul = $("ul.layers", page).html('');
  $("h3.title", page).text(groupe.name);
  $(".description", page).html(groupe.description);

  // Liste des layers
  groupe.layers.forEach(l => {
    if (l.type == "feature-type") {
      $('<li>').html('')
        .append($('<h4>').html(l.table.title))
        .append($('<div>').text(l.table.description))
        .appendTo(ul);
    } else if ( l.geoservice && l.geoservice.type ==='WFS') {
      $('<li>').html('')
        .append($('<h4>').html(l.geoservice.title+' <i>(externe)</i>'))
        .append($('<div>').text(l.geoservice.description))
        .appendTo(ul);
    }
  });

  // Credential
  if (infoCache.auth) {
    $(".auth", page).off()
      .click(function () {
        // Remove credentials
        var layer;
        for (var k=0, l; l=groupe.layers[k]; k++) {
          if (l.username) layer = l;
          delete l.password;
        }
        var current = wapp.userManager.param.active_community;
        if (wapp.userManager.param.active_community === groupe.id) wapp.setGuichet();
        wapp.report.saveParam();
        // Clear credentials
        var win = window.open('logout.html','_blank','clearsessioncache=yes,hidden=yes');
        setTimeout(function(){ win.close(); }, 100);

        // Ask for new credentials
        var content = CordovApp.template("dialog-authenticate");
        $('span', content).text(layer.geoservice.name);
        wapp.dialog.show (content, {
          title: "Connexion", 
          buttons: { submit:"OK", cancel:"Annuler" },
          callback: function(b) {
            if (b=='submit') {
              var cryp = new ol_layer_Vector_WFS();
              for (var k=0, l; l=groupe.layers[k]; k++) {
                if (l.username) {
                  l.username = $('.nom', content).val() || 'none';
                  l.password = cryp.crypt($('.pwd', content).val());
                }
              }
              if (current === groupe.id) wapp.setGuichet(current);
            } 
          }
        });
      })
      .show();
  } else {
    $(".auth", page).hide();
  }
};




/** Recherche des guichets de l'utilisateur
 */
wapp.initGuichets = function() {
  // Reset list
  var ul = $('#communities [data-role="content"] ul');
  if (!template) template = $('[data-role="template"]', ul).html();
  ul.html("");
  if (!wapp.userManager.apiClient.isConnected() && !wapp.userManager.param.communities) {
    wapp.setGuichet();
    setGeoportailLayers();
    return;
  }
   
  // Recherche des groupes
  var groupes = wapp.userManager.param.communities || [];
  const geoportailLayers = {};
  var current;
  groupes.forEach((g) => {
    if (wapp.noguichetConfig !== undefined  ) {
      if (g.id != wapp.noguichetConfig){
        return;
      }
    }
    console.log('Guichets: '+ g.id);
    // Chargement des logos
    if (g.logo_url) {
      wapp.userManager.apiClient.getDocument(encodeURI(g.logo_url)).then((response) => {
        CordovApp.File.saveData(response.data, "TMP/logo/"+g.id, null, null, true);
      });
    }
    if (wapp.noguichetConfig !== undefined && wapp.noguichetConfig == g.id) {
      current = g
    }
    else if (wapp.userManager.param.active_community == g.id) current = g;
  
    var li = $('<li>').html(template)
      .data('groupe', g)
      .appendTo(ul);
    li.on("click", () => {
      if (!li.hasClass('selected')) {
        messageDlg ("Etes vous sûrs de vouloir changer de groupe?",
          "Changement de groupe", {
            ok: "confirmer",
            cancel: "annuler"
          },
          function (b) {
            if (b == "ok") {
              wapp.setGuichet(li.data('groupe'));
              //wapp.hidePage();
              wapp.showPage('layer-guichet')
            }
          });        
      } else {
        wapp.setGuichet();
        // Faire clignoter
        li.addClass('active');
        setTimeout(function(){ li.removeClass('active'); }, 200);
      }
    });
    $('.title', li).text(g.name);
    $('.description', li).html(g.description)
    $('.fa-info-circle', li).on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wapp.dialogInfoGuichet(li.data('groupe'));
    });
    $('img', li).hide();
    wapp.getLogo (g, (f) => {
      $('img', li).attr('src',f).show();
    });
  });

  if ($("li", ul).length) {
    $('#communities [data-role="content"]').removeClass('nomap');
    $('body').addClass('guichet');
  } else {
    $('#communities [data-role="content"]').addClass('nomap');
    $('body').removeClass('guichet');
  }

  wapp.setGuichet(current);
};


/** 
 * Guichet en cours de modification
 * @param {Integer|Object} groupe le groupe ou l identifiant du groupe
 */
wapp.setGuichet = function(groupe) {
  if (typeof(groupe)==='number') {
    groupe = wapp.userManager.getGroupById(groupe);
  }
  if (!groupe) groupe = { };
  wapp.select.getFeatures().clear();

  // Check if has groupe
  if (wapp.userManager.param && wapp.userManager.param.communities) {
    if (wapp.userManager.param.communities.length) document.body.setAttribute('data-guichet', groupe.id || 'none' );
    else document.body.removeAttribute('data-guichet');
  } else {
    document.body.removeAttribute('data-guichet');
  }

  var success =  function(community) {
    wapp.guichet = community;
    wapp.onSelect();
    let layers = community.layers;
    const geoportailLayers = {};
    for (let i in layers) {
      let geoservice = layers[i].geoservice;
      let type = geoservice ? geoservice.type : 'WFS';
      if (type == 'WMTS' && (geoservice.url.indexOf('geoportail') != -1 || geoservice.url.indexOf('data.geopf') != -1)) {
        geoportailLayers[geoservice.layers] = layers[i];
      }
    }

    // Mettre a jour la liste
    $('#communities li').each(function() {
      if ($(this).data('groupe')===groupe) $(this).addClass('selected');
      else $(this).removeClass('selected');
    });

    // Mettre a jour la page des couches
    const gdiv = $('#couches .couches .couche.guichet');
    $('.name', gdiv).text(wapp.guichet.name || '');

    // Mettre à jour le logo affiché dans le menu principal avec une URL compatible Capacitor
    // NOTE : ce code surcharge simplement l'implémentation de CordovApp.UserManagerTemplating.refreshGroupInfos, qui utilise toujours le fichier Cordova File API, et non Capacitor File API
    try {
      wapp.getLogo(community, function(src) {
        const safeSrc = src || 'img/ign.png';
        $("img.logo:not(.back)").attr('src', safeSrc).show();
      });
    } catch (e) { /* ignore */ }

    $("#couches").on('showpage', function(){
      let nbModifs = 0;
      let layers = wapp.getLayerGuichet().getLayers().getArray();
      for (let i in layers) {
        if (!layers[i].getSource() || typeof layers[i].getSource().nbModifications != 'function') continue;
        nbModifs = parseInt(nbModifs) + parseInt(layers[i].getSource().nbModifications());
      }
      $(".fa-send .tag", gdiv).text(nbModifs);
    });

    $(".fa-send", gdiv).on('click', function(){
      if (parseInt($(".fa-send .tag", gdiv).text()) < 1) {
        wapp.alert("Toutes les modifications ont déjà été envoyées.");
        return;
      }
      let layers = wapp.getLayerGuichet().getLayers().getArray();
      let layersToSave = [...layers];
      saveLayers(layersToSave);
    });

    // Mettre a jour le guichet
    wapp.setInfoGuichet(community);
    // Charger les couches
    wapp.loadLayers(community);
    // Afficher
    wapp.getLayerGuichet().setVisible(wapp.param.visibleLayers.guichet);

    setGeoportailLayers(geoportailLayers);

    //on recharge la couche des signalements
    wapp.report.signalements.getSource().getSource().clear();
  };
  
  // Synchroniser le logo du menu lors d'un changement de groupe (événement hérité)
  // NOTE : ce code surcharge simplement l'implémentation de CordovApp.UserManagerTemplating.refreshGroupInfos, qui utilise toujours le fichier Cordova File API, et non Capacitor File API
  try {
    $(document).on('changegroup', function(e) {
      const community = (e && e.community) ? e.community : wapp.guichet;
      if (!community) return;
      wapp.getLogo(community, function(src) {
        const safeSrc = src || 'img/ign.png';
        $("img.logo:not(.back)").attr('src', safeSrc).show();
      });
    });
  } catch (e) { /* ignore */ }

  // Nouveau guichet
  if (groupe && groupe.id) {
    wapp.waitLogo("Chargement du groupe", true);
    wapp.userManager.setCommunity(groupe.id).then((community) => {
      success(community);
    }).finally(() => {
      wapp.wait(false);
      wapp.dispatchEvent({ type: 'change:guichet', group: groupe })
    });
  } else {
    // Mettre a jour le guichet
    wapp.setInfoGuichet(groupe);
    // Charger les couches
    wapp.loadLayers(groupe);
    setGeoportailLayers();
    wapp.dispatchEvent({ type: 'change:guichet', group: groupe })
  }

};


/** Affichage des infos du guichet
 */
wapp.setInfoGuichet = function(groupe) {
  var content = document.querySelector('#layer-guichet .guichet');
  console.log('setInfoGuichet',groupe);

  // Affichage du groupe
  wapp.vectorCache.setCurrentGuichet(groupe);

  // Display info
  $('h3', content).text(groupe.name || '');
  $('img', content).hide();
  wapp.getLogo(groupe, function(src) {
    if (src) $('img', content).attr('src',src).show();
  });
};


/**
 * Guichet en cours
 */
wapp.getIdGuichet = function(){
  return wapp.userManager.param.active_community;
};

/** Envoyer le signalements courant
*/
wapp.postGeorem = function() {
  var f = wapp.select.getFeatures().item(0);
  var grem = f.get('georem');
  wapp.select.selectFeature();
  if (grem) wapp.report.postLocalRem (grem, {
    cback: function(prem) {
      f = wapp.report.getFeature(prem);
      wapp.select.selectFeature(f, wapp.report.layer);
      wapp.wait(false)
    },
    error: function(e, msg) {
      wapp.select.selectFeature(f, wapp.report.layer);
      wapp.alert(msg);
    }
  });
};

/** Modifier le signalements courant
*/
wapp.modifyGeorem = function() {
  var f = wapp.select.getFeatures().item(0);
  var grem = f.get('georem');
  // Get feature if  croquis
  if (f.layer === wapp.report.croquis) grem = grem.get('georem');
  wapp.select.selectFeature();
  if (grem) wapp.report.showFormulaire (grem);
};

/** Supprimer le signalement courant
 * @param {boolean} warning Ask before delete
 */
wapp.delGeorem = function(warning) {
  var f = wapp.select.getFeatures().item(0);
  var grem = f.get('georem');
  if (warning) {
    const hasResp = grem.responses ? '<br/><i class="fa fa-warning"></i> Ce signalement contient des réponses non envoyées...' : '';
    wapp.message('Voulez-vous vraiment supprimer le signalement ?'+hasResp, 'Suppression', 
      { ok:'ok', cancel:'annuler' },
      function(bt) {
        if (bt==='ok') wapp.delGeorem();
      });
  } else {
    if (grem) {
      wapp.select.getFeatures().clear();
      wapp.report.delLocalRem (grem);
      wapp.showSelect();
    }
  }
};

/** Format geom string
 * @param {ol.geom}
 */
wapp.getGeomFr = function(g) {
  switch (g.getType()) {
    case 'LineString': return 'Ligne';
    case 'Polygon': return 'Surface';
    default: return g.getType();
  }
}

/** Afficher le formulaire de signalement
*/
wapp.showReportForm = function() {
  //wapp.showOnglet("signal");
  wapp.showPage('fiche', 'signal');
};


/** Ouverture de la page de chargement du cache 
 */
wapp.loadCache = function (cancel) {
  const hasCache = wapp.getCache(wapp.guichet);
  if (hasCache && hasCache.cache) {
    wapp.vectorCache.loadCache(hasCache.cache, cancel);
  }
};

/** Centrer sur le cache vecteur
 */
wapp.centerCache = function () {
  const hasCache = wapp.getCache(wapp.guichet);
  if (hasCache && hasCache.cache) {
    wapp.map.getView().fit(wapp.getCache(wapp.guichet).cache.extent);
  }
};

/** Mise a jour du cache courant
 */
wapp.updateCache = function(layer) {
  wapp.message(
    'Mettre à jour les données du guichet. Si vous continuez, toutes vos modifications seront envoyées.<br/><i>Cette opération peut être longue</i>',
    'Mise à jour', 
    { ok:'Mettre à jour', cancel:'annuler' },
    (b) => {
      if (b==='ok') {
        const hasCache = wapp.getCache(wapp.guichet);
        if (hasCache) {
          //wapp.vectorCache.updateCache(hasCache.cache)
          const layers = layer ? [layer] : wapp.getLayerGuichet().getLayers().getArray().slice();
          wapp.saveContext();
          wapp.vectorCache.saveLayer (layers, hasCache.cache);
        }
      }
    }
  );
};

/** Ajouter un layer au cache
 * @param {ol.layer.CollabVector} layer
 */
wapp.appendLayerToCache = function(layer) {
  if (!layer.table) return;
  var name = layer.table.name
  var guichet = this.vectorCache.getCurrentGuichet();
  for (var i=0, l; l = guichet.layers[i]; i++) {
    if (l.type === 'feature-type' && l.table.tile_zoom_level && name === l.table.name) {
      break;
    }
  }
  if (l) {
    wapp.message(
      'Ajouter une couche en édition<br/><i>Cette opération peut être longue...</i>',
      'Edition', 
      { ok: 'Ajouter', cancel: 'Annuler' },
      (b) => {
        if (b==='ok') {
          // Add to cache
          const cache = wapp.getCache(wapp.guichet).cache;
          cache.layers.push(l);
          // Reload cache
          wapp.wait('Chargement...');
          wapp.vectorCache.uploadLayers(cache, false);
        }
      });
  } else {
    console.warn('[AppendLayerToCache]: No layer found');
    wapp.alert('Impossible de charger ce type de données...');
    return;
  }
  return;
};


/** Mettre a jour la carte
*/
$("#fiche").on("showpage hidepage", function() {
  wapp.map.updateSize();
});

/** Affichage de la page du guichet
 */
wapp.showGuichet= function() {
  if (!wapp.userManager.param.communities) {
    wapp.alert(CordovApp.template('dialog-noconnect'));
  } else if (wapp.userManager.param.communities.length) {
    wapp.showPage('layer-guichet');
  } else {
    wapp.alert(CordovApp.template('dialog-noguichet'));
  }
}




export default wapp
