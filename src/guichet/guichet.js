/* Gestion des guichets
*/
import ol_layer_Vector_WFS from 'cordovapp/ol/layer/WFS'

import wapp from '../wapp'
import CordovApp from 'cordovapp/Cordovapp'
import setGeoportailLayers from '../map/layer/geoportail'
import './layer'
import './edition'
import './conflict'
import './fiche'

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
          wapp.alert('Impossible de sauvegarder '+l.get('title')+'<br/><i class="error">'+error+'</i>');
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
      if (l.type==='WFS') {
        // Has authentication ?
        info.auth = info.auth || l.username;
        // Hors ligne ?
        cache.forEach(c => {
          if (c.id_guichet === groupe.id_groupe) {
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
    groupe = wapp.guichet;
  }
  if (!groupe.layers) {
    wapp.showDialog('dialog-info-guichets');
    return;
  }

  const infoCache = wapp.getCache(groupe);

  /*
  var hasOffline = false;
  // VNF PATCH 
  hasOffline = groupe.id_groupe===200 || groupe.id_groupe===13 || groupe.id_groupe===375 || $('.debug').css('display')!=='none';
  console.log('OFFLINE', hasOffline);
  console.log(groupe);
  if (hasOffline) {
    $('#guichet [data-role="onglet-bt"] [data-list="offline"]').show();
  }
  else {
    $('#guichet [data-role="onglet-bt"] [data-list="offline"]').hide();
    wapp.showOnglet('guichet');
  }
  */

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
  $("h3.title", page).text(groupe.nom);
  $(".description", page).html(groupe.desc);

  // Liste des layers
  groupe.layers.forEach(l => {
    if (l.type==='WFS') {
      $('<li>').html('')
        .append($('<h4>').html(l.nom+(l.external?' <i>(externe)</i>':'')))
        .append($('<div>').text(l.description))
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
        var current = wapp.ripart.param.guichet;
        if (wapp.ripart.param.guichet === groupe.id_groupe) wapp.setGuichet();
        wapp.ripart.saveParam();
        // Clear credentials
        var win = window.open('logout.html','_blank','clearsessioncache=yes,hidden=yes');
        setTimeout(function(){ win.close(); }, 100);

        // Ask for new credentials
        var content = CordovApp.template("dialog-authenticate");
        $('span', content).text(layer.nom);
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
              if (current === groupe.id_groupe) wapp.setGuichet(current);
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
  var ul = $('#guichets [data-role="content"] ul');
  if (!template) template = $('[data-role="template"]', ul).html();
  ul.html("");
  if (!this.ripart.isConnected()) {
    wapp.setGuichet();
    setGeoportailLayers();
    return;
  }
  // Recherche des groupes
  var groupes = wapp.ripart.param.groupes;
  const geoportailLayers = {};
  var current;
  groupes.forEach((g) => {
    // Chargement des logos
    if (g.logo) {
      CordovApp.File.dowloadFile(
        g.logo, 
        "TMP/logo/"+g.id_groupe,
        undefined,
        undefined, {
          headers: {
            'Authorization': 'Basic '+ wapp.ripart.getHash()
          }
        }
      );
    }
    // Guichet courant
    if (this.ripart.param.guichet == g.id_groupe) current = g;
    // Affichage si WFS
    var couches = "";
    
    g.layers.forEach((layer) => {
      let type = layer.type;
      if (type != 'WFS' && layer.url && layer.layer && layer.url.indexOf("geoportail") != -1) {
        type = 'GeoPortail';
      }

      switch (type) {
        case 'WFS': {
          couches += (couches?", ":"")+layer.nom;
          break;
        }
        case 'GeoPortail': {
          geoportailLayers[layer.layer] = layer;
          break;
        }
        default: break;
      }
    });
    if (couches) {
      var li = $('<li>').html(template)
        .data('groupe', g)
        .appendTo(ul);
      li.click(() => {
        if (!li.hasClass('selected')) {
          wapp.setGuichet(li.data('groupe'));
          //wapp.hidePage();
          wapp.showPage('layer-guichet')
        } else {
          wapp.setGuichet();
          // Faire clignoter
          li.addClass('active');
          setTimeout(function(){ li.removeClass('active'); }, 200);
        }
      });
      $('.title', li).text(g.nom);
      $('.layers', li).text(couches);
      $('.fa-info-circle', li).on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        wapp.dialogInfoGuichet(li.data('groupe'));
      });
      $('img', li).hide();
      wapp.getLogo (g, (f) => {
        $('img', li).attr('src',f).show();
      });
    }
  });

  setGeoportailLayers(geoportailLayers);

  if ($("li", ul).length) {
    $('#guichets [data-role="content"]').removeClass('nomap');
    $('body').addClass('guichet');
  } else {
    $('#guichets [data-role="content"]').addClass('nomap');
    $('body').removeClass('guichet');
  }

  // Update on show
  $('#guichets').on('showpage', () => {
    $('li', ul).each(function() {
      const groupe = $(this).data('groupe');
      const c = wapp.getCache(groupe);
      $(this).removeClass('cache edit');
      if (c.auth) {
        $(this).addClass('cache');
      }
      if (c.cache) {
        $(this).addClass('cache edit');
      }
    });
  });

console.log('[TODO] set guichet')
  wapp.setGuichet(current);
};


/** Guichet en cours de modification
*/
wapp.setGuichet = function(groupe) {
console.log('setGuichet', groupe)

  if (typeof(groupe)==='number') {
    groupe = wapp.ripart.getGroupById(groupe);
  }
  if (!groupe) groupe = { };

  // Check if has groupe
  if (wapp.ripart.param && wapp.ripart.param.groupes) {
    if (wapp.ripart.param.groupes.length) document.body.setAttribute('data-guichet', groupe.id_groupe || 'none' );
    else document.body.removeAttribute('data-guichet');
  } else {
    document.body.removeAttribute('data-guichet');
  }
  
  
  // Nouveau guichet
  this.ripart.param.guichet = groupe.id_groupe;
  wapp.ripart.saveParam();
  wapp.select.getFeatures().clear();
  wapp.onSelect();
  wapp.guichet = groupe;

  // Mettre a jour la liste
  $('#guichets li').each(function() {
    if ($(this).data('groupe')===groupe) $(this).addClass('selected');
    else $(this).removeClass('selected');
  });

  // Mettre a jour la page des couches
  const gdiv = $('#couches .couches .couche.guichet');
  $('.name', gdiv).text(wapp.guichet.nom || '');
  if (wapp.getCache(wapp.guichet).cache) {
    gdiv.removeClass('online');
  } else {
    gdiv.addClass('online');
  }

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

/*
console.log('[DEPRECATED] setGuichet');
  $('#cartes [data-list="guichets"] ul.guichet li').each(function() {
    if ($(this).data('groupe')===groupe) $(this).addClass('selected');
    else $(this).removeClass('selected');
  });
*/

  // Mettre a jour le guichet
  wapp.setInfoGuichet(groupe);
  // Charger les couches
  wapp.loadLayers(groupe);
  // Afficher
  wapp.getLayerGuichet().setVisible(wapp.param.visibleLayers.guichet);
};


/** Affichage des infos du guichet
 */
wapp.setInfoGuichet = function(groupe) {
  var content = document.querySelector('#layer-guichet .guichet');
  console.log('setInfoGuichet',groupe);

  /* VNF PATCH * /
  hasOffline = groupe.id_groupe===200 || groupe.id_groupe===13 || groupe.id_groupe===375 || $('.debug').css('display')!=='none';
  console.log('Hide offline', groupe.id_groupe, hasOffline);
  if (hasOffline) {
    content.classList.add('offline');
  } else {
    content.classList.remove('offline');
  }
  */
  // var cache = wapp.getCache(groupe);

  // Affichage du groupe
  wapp.vectorCache.setCurrentGuichet(groupe);

  // Display info
  $('h3', content).text(groupe.nom || '');
  $('img', content).hide();
  wapp.getLogo(groupe, function(src) {
    if (src) $('img', content).attr('src',src).show();
  });
};


/**
 * Guichet en cours
 */
wapp.getIdGuichet = function(){
  return this.ripart.param.guichet;
};

/** Envoyer le signalements courant
*/
wapp.postGeorem = function() {
  var f = wapp.select.getFeatures().item(0);
  var grem = f.get('georem');
  wapp.select.selectFeature();
  if (grem) wapp.ripart.postLocalRem (grem, {
    cback: function(prem) {
      f = wapp.ripart.getFeature(prem);
      wapp.select.selectFeature(f, wapp.ripart.layer);
      wapp.wait(false)
    },
    error: function(e, msg) {
      wapp.select.selectFeature(f, wapp.ripart.layer);
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
  if (f.layer === wapp.ripart.croquis) grem = grem.get('georem');
console.log('modify', f, grem)
  wapp.select.selectFeature();
  if (grem) wapp.ripart.showFormulaire (grem);
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
      wapp.ripart.delLocalRem (grem);
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
wapp.showRipartForm = function() {
  //wapp.showOnglet("signal");
  wapp.showPage('fiche', 'signal');
};

/** Affichage de la page de gestion des cartes
*	- Mise a jour des infos du guichet
*/
$("#cartes").on("showpage", function() {
  if (!wapp.vector) return;

  console.log("TODO : cartes info");
  return;
/*
  var ftype = wapp.vector.getFeatureType();
  var d = $("li[title=\""+ftype.fullName+"\"]", this);

  $('li', this).removeClass("select");
  $('li [data-input-role="info"]', this).html("");

  d.addClass('select');

  if (wapp.vector.getSource())
  {	var features = wapp.vector.getSource().getFeatures();
    var nb = features.length;
    var t={};
    for (var i=0, f; f = features[i]; i++)
    {	var s = f.getState();
      if (!t[s]) t[s]=1;
      else t[s] += 1;
    }

    var info = nb + " objet(s) chargé(s)"
      + " - "
      + (t.Update||0) + " objet(s) modifié(s)";
    $('[data-input-role="info"]', d).html(info);
  }
*/
});

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
 * @param {ol.layer.Webpart} layer
 */
wapp.appendLayerToCache = function(layer) {
  var name = layer.nom
  var guichet = this.vectorCache.getCurrentGuichet();
  for (var i=0, l; l = guichet.layers[i]; i++) {
    if (l.type === 'WFS' && l.tilezoom && name === l.nom) {
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
  if (!wapp.ripart.param.groupes) {
    wapp.alert(CordovApp.template('dialog-noconnect'));
  } else if (wapp.ripart.param.groupes.length) {
    wapp.showPage('layer-guichet');
  } else {
    wapp.alert(CordovApp.template('dialog-noguichet'));
  }
}

export default wapp
