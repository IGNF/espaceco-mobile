/* Gestion des guichets
*/
import {containsCoordinate as ol_extent_containsCoordinate} from 'ol/extent'
import ol_layer_Vector_WFS from 'cordovapp/ol/layer/WFS'
import ol_layer_Vector_Webpart from 'cordovapp/ol/layer/Webpart'

import wapp from '../wapp'
import CordovApp from 'cordovapp/Cordovapp'
import './layer'
import './edition'
import ol_layer_Geoportail from 'ol-ext/layer/Geoportail'

let template = null;

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

wapp.initGuichet2 = function() {
  // Layers geoportail
  const geopotalLayers = {};
  function getGeopotalLayers(layers) {
    layers.forEach((l) => {
      if (l.getLayers) {
        getGeopotalLayers(l.getLayers());
      } else {
        if (l instanceof ol_layer_Geoportail && !/^cache_/.test(l.get('name'))) {
          geopotalLayers[l.get('name')] = l;
          l.set('displayInLayerSwitcher', l.get('defaultLayer'));
        }
      }
    });
  }
  getGeopotalLayers(wapp.map.getLayers());
  

  console.log('initGuichet2')
  // Reset list
  var ul = $('#guichets [data-role="content"] ul');
  if (!template) template = $('[data-role="template"]', ul).html();
  ul.html("");
  if (!this.ripart.isConnected()) {
    wapp.setGuichet();
    return;
  }
  // Recherche des groupes
  var groupes = wapp.ripart.param.groupes;
  var current = {};
  groupes.forEach((g) => {
    // Chargement des logos
    if (g.logo) {
      CordovApp.File.dowloadFile(g.logo, "TMP/logo/"+g.id_groupe);
    }
    // Guichet courant
    if (this.ripart.param.guichet == g.id_groupe) current = g;
    // Affichage si WFS
    var couches = "";
    g.layers.forEach((layer) => {
      switch (layer.type) {
        case 'WFS': {
          couches += (couches?", ":"")+layer.nom;
          break;
        }
        case 'GeoPortail': {
          const l = geopotalLayers[layer.nom]
          if (l) {
            l.set('displayInLayerSwitcher', true);
          }
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
          wapp.hidePage();
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

  if ($("li", ul).length) {
    $('#guichets [data-role="content"]').removeClass('nomap');
  } else {
    $('#guichets [data-role="content"]').addClass('nomap');
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
//  wapp.setGuichet(current);
};

/** Recherche des guichets de l'utilisateur
*/
wapp.initGuichets = function() {
console.log('[DEPRECATED] initguichet')
  // Reset list
  var ul = $('#cartes [data-list="guichets"] ul.guichet');
  ul.html("");
  if (!this.ripart.isConnected()) {
    wapp.setGuichet();
    return;
  }
  this.initGuichet2();
  // Recherche des groupes
  var groupes = wapp.ripart.param.groupes;
  var current = {};
  for (var i=0, g; g = groupes[i]; i++) {
    // Chargement des logos
    if (g.logo) {
      CordovApp.File.dowloadFile(g.logo, "TMP/logo/"+g.id_groupe);
    }
    // Guichet courant
    if (this.ripart.param.guichet == g.id_groupe) current = g;
    // Affichage si WFS
    var couches = "";
    for (var j=0; j<g.layers.length; j++) {
      if (g.layers[j].type=="WFS") couches += (couches?", ":"")+g.layers[j].nom;
    }
    if (couches) {
      var li = $("<li>")
        .data('groupe', g)
        .text(g.nom)
        .append($("<i>").text(couches))
        .attr("data-input","")
        .click(function() {
          var self = $(this);
          if (!self.hasClass('selected')) {
            wapp.setGuichet($(this).data('groupe'));
            wapp.hidePage();
          } else {
            wapp.setGuichet();
            // Faire clignoter
            self.addClass('active');
            setTimeout(function(){ self.removeClass('active'); }, 200);
          }
        })
        .appendTo(ul);
      $("<i>").addClass('fa fa-info-circle')
        .click(function(e){
          e.preventDefault();
          e.stopPropagation();
          wapp.showGuichetInfo($(this).parent().data('groupe'));
        })
        .appendTo(li);
      wapp.getLogo (g, function(f) {
        $("<img>").attr("src",f).prependTo(this);
      }, li);
    }
  }
  if ($("li", ul).length) $('#cartes [data-list="guichets"] ul.nomap').hide();
  else $('#cartes [data-list="guichets"] ul.nomap').show();
  wapp.setGuichet(current);
};

/** Afficher les infos du guichet
 * @param {} groupe
 */
wapp.showGuichetInfo = function (groupe) {

console.log('[DEPRECATED: showInfoGuichet');

  var hasOffline = false;
  /* VNF PATCH */
  hasOffline = groupe.id_groupe===200 || groupe.id_groupe===13 || groupe.id_groupe===375 || $('.debug').css('display')!=='none';
  console.log('Hide offline', groupe.id_groupe, hasOffline);
  /**/
  if (hasOffline) {
    $('#guichet [data-role="onglet-bt"] [data-list="offline"]').show();
  }
  else {
    $('#guichet [data-role="onglet-bt"] [data-list="offline"]').hide();
    wapp.showOnglet('guichet');
  }

  wapp.showPage('guichet');
  var page = $('#guichet');
  wapp.vectorCache.setCurrentGuichet(groupe);
  $('img', page).hide();
  wapp.getLogo(groupe, function(src) {
    $('img', page).attr('src',src).show();
  });
  var ul = $("ul.layers", page).html('');
  $("h3.title", page).text(groupe.nom);
  $(".description", page).html(groupe.desc);
  var auth = false;
  var offline = false;
  for (var i=0, l; l=groupe.layers[i]; i++) {
    if (l.type==='WFS') {
      // Has authentication ?
      auth = auth || l.username;
      // Hors ligne ?
      if (!offline && l.mask && l.mask.loadStartegy) offline = 'once';
      else offline = true;
      // Add to list
      $('<li>').html('')
        .append($('<h4>').html(l.nom+(l.external?' <i>(externe)</i>':'')))
        .append($('<div>').text(l.description))
        .appendTo(ul);
    }
  }
  // Gestion du cache vecteur
  if (offline) {
    page.addClass('offline');
    $('[data-mode="offline"] > *', page).hide();
    if (offline==='once') {
      $('.once', page).show();
    } else {
      $('.cartes', page).show();
      wapp.vectorCache.showList();
    }
  } else {
    page.removeClass('offline');
  }
  if (auth) {
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
  }
  else $(".auth", page).hide();
};

/** Guichet en cours de modification
*/
wapp.setGuichet = function(groupe) {

console.log('setGuichet')

  if (typeof(groupe)==='number') {
    groupe = wapp.ripart.getGroupById(groupe);
  }
  if (!groupe) groupe = {};
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
  $('.name', gdiv).text(wapp.guichet.nom);
  if (wapp.getCache(wapp.guichet).cache) {
    gdiv.removeClass('online');
  } else {
    gdiv.addClass('online');
  }

console.log('[DEPRECATED] setGuichet');
  $('#cartes [data-list="guichets"] ul.guichet li').each(function() {
    if ($(this).data('groupe')===groupe) $(this).addClass('selected');
    else $(this).removeClass('selected');
  });

  // Mettre a jour le guichet
  wapp.setInfoGuichet(groupe);
  // Charger les couches
  wapp.loadLayers(groupe);
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
  $('h3', content).text(groupe.nom);
  $('img', content).hide();
  wapp.getLogo(groupe, function(src) {
    $('img', content).attr('src',src).show();
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
    error: function() {
      wapp.select.selectFeature(f, wapp.ripart.layer);
    }
  });
};

/** Modifier le signalements courant
*/
wapp.modifyGeorem = function() {
  var f = wapp.select.getFeatures().item(0);
  var grem = f.get('georem');
  wapp.select.selectFeature();
  if (grem) wapp.ripart.showFormulaire (grem);
};

/** Supprimer le signalement courant
 * @param {boolean} warning Ask before delete
 */
wapp.delGeorem = function(warning) {
  if (warning) {
    wapp.message('Voulez-vous vraiment supprimer le signalement ?', 'Suppression', 
      { ok:'ok', cancel:'annuler' },
      function(bt) {
        if (bt==='ok') wapp.delGeorem();
      });

  } else {
    var f = wapp.select.getFeatures().item(0);
    var grem = f.get('georem');
    if (grem) {
      wapp.select.getFeatures().clear();
      wapp.ripart.delLocalRem (grem);
      wapp.showSelect();
    }
  }
};

/* Add attribute line to the selection list
 * @param {} th container
 * @param {} ul the list
 * @param {string} title
 * @param {string} val
 */
function _addLine(th, ul, title, val, type) {
  var theme, label;
  var index = title.indexOf('@');
  if (index > -1) {
    theme = title.substring(0, index);
    label = title.substring(index+1);
  } else {
    theme = "hidden";
    label = title;
  }
  // Hidden themes
  if (theme==='symb') return;
  // Add new theme
  var className = theme.replace(/ /g,'_');
  if (theme && !$('.'+className, th).length) {
    $('<div>').addClass(className)
      .text(theme)
      .click(function(){
        $('div', th).removeClass('selected');
        $('.'+className, th).addClass('selected');
        $('li', ul).hide();
        $('.'+className, ul).show();
      })
      .appendTo(th);
  }
  // Add line
  var li = $("<li>").addClass(className).appendTo(ul);
  switch (type) {
    case 'JSON':
    case 'JsonValue': {
      // Json decode
      var json;
      try { json = JSON.parse (val); }
      catch(e) { /* ok */ }
      // Array
      if (json instanceof Array && json.length) {
        var tab = $("<table>").appendTo(li);
        var tr = $("<tr>").appendTo(tab);
        var i, k;
        for (k in json[0]) {
          $("<td>").text(k.replace(/_/g,' ')).appendTo(tr);
        }
        for (i=0; i<json.length; i++) {
          tr = $("<tr>").appendTo(tab);
          for (k in json[i]) {
            $("<td>").text(json[i][k])
              .addClass(typeof(json[i][k]))
              .appendTo(tr);
          }
        }
        break;
      }
    }
    // fallsthrough
    default: {
      $("<label>")
        .text(label)
        .appendTo(li);
      $("<span>").text(val)
        .appendTo(li);
      break;
    }
  }
}


wapp.getGeomFr = function(g) {
  switch (g.getType()) {
    case 'LineString': return 'Ligne';
    case 'Polygon': return 'Surface';
    default: return g.getType();
  }
}
wapp.getFeatureTitle = function(f) {
  var prop = f.getProperties();
  if (prop.georem) {
    return ('Signalement'+(prop.georem.id?'#'+prop.georem.id:''));
  }
  for (var i in prop) {
    if (/name|nom|label/.test(i)) {
      return prop[i] + 
      ' <i>('+wapp.getGeomFr(f.getGeometry())+')</i>';
    }
  }
  return '<i>sans nom</i>';
};

/** Afficher la fiche
* @param {any}  options
*	@param {bool} options.ripart true si vient de la page de remontees 
*	@param {int} options.index position dans le liste de selection
*/
wapp.showSelect = function(options) {
  options = options || {};
  let features = [];
  const currentFeatures = options.features || $.extend([],this.select.getFeatures().getArray());
  currentFeatures.forEach((f) => {
    // Cluster ?
    if (f.get('features')) {
      features = features.concat(f.get('features'));
    } else {
      features.push(f);
    }
  });
  var nb = features.length;

  // Ne pas passer par le liste
  options.index = options.index || 0;

  // Current feature
  if (options.index && options.index>=nb) options.index = 0;
  if (options.index && options.index<0) options.index = nb-1;
  var f = features[options.index || 0];

  if (options.ripart) $("#fiche").addClass("fromRipart");
  else $("#fiche").removeClass("fromRipart");

  var div = $('#fiche .selection').removeClass("georem fiche trace multi");
  div.get(0).scrollTop = 0;
  var i, ul, th, att;

  // Pas de selection
  if (options.index===undefined && nb>1) {
    div.addClass("fiche");
    $(".fiche h3", div).html(nb+' objets sélectionnés :');
    $(".fiche img.guichet", div).hide();
    ul = $(".fiche ul", div).html('');
    th = $(".fiche .themes", div).html('');
    i = 0;
    this.select.getFeatures().forEach (function(f){
      $('<li>').html(wapp.getFeatureTitle(f))
        .data('index', i++)
        .click(function(){
          wapp.showSelect({ index: $(this).data('index'), features: features });
        })
        .appendTo(ul);
    });
  } else if (f) {
    if (nb>1) {
      div.addClass('multi');
      $('.multi span', div).html(((options.index||0)+1)+'/'+nb);
    }
    $(".next", div).off().click(function(){
      wapp.showSelect({ index: (options.index||0)+1, features: features });
    });
    $(".prev", div).off().click(function(){
      wapp.showSelect({ index: (options.index||0)-1, features: features });
    });

    this.select.getFeatures().clear();
    this.select.getFeatures().push(f);
    $("#selection").html (f.get("nom")||"Afficher la sélection...");
    var prop = f.getProperties();
    var georem = prop.georem || prop.ripart;
    // Hide edition
    $('.edit').hide();
    // Georem
    if (georem) {
      div.addClass("georem").removeClass("fiche");
      if (georem.sketch) georem.nb = wapp.ripart.sketch2feature(georem.sketch).length;
      else georem.nb = 0;
      wapp.dataAttributes($(".georem", div), georem);
      if (prop.ripart) $(".georem .del", div).hide();
      else $(".georem .del", div).show();
    } else {
      // Fiche de l'objet
      div.addClass("fiche");
      // Layer de l'objet
      $(".fiche h3", div).text('Couche : '+f.layer.get("title")||f.layer.get("name"));
      if (f.layer.get("logo")) {
        $(".fiche img.guichet", div).attr('src', f.layer.get("logo")).show();
      } else {
        $(".fiche img.guichet", div).hide();
      }
      var saveTheme =  $(".fiche .themes .selected", div).removeClass('selected').attr('class');
      ul = $(".fiche ul", div).html('');
      th = $(".fiche .themes", div).html("");
      // Trace GPS
      if (f.layer.get('geolocation')) {
        div.addClass("trace");
      } else if (f.layer instanceof ol_layer_Vector_Webpart) {
        // Objet d'un guichet
        console.log(f)
        if (f.layer.get('cache')) $('.edit').show();
        var ftype = f.layer.getSource().featureType_;
        for (i in ftype.attributes) if (i !== ftype.geometryName) {
          att = ftype.attributes[i];
          switch (att.type) {
            case "Point":
            case "LineString":
            case "Polygon":
            case "MultiPolygon":
              break;
            default: {
              _addLine(th, ul, att.title, f.get(i), att.type);
              break;
            }
          }
        }
      } else if (f.layer.get("getFeatureInfoMask")) {
        // Objet WMS
        var visu = f.layer.get("getFeatureInfoMask").visu;
        for (i in visu) {
          _addLine(th, ul, visu[i].replace(/_/g,' '), f.get(i));
        }
      } else if (f.layer.getFeatureType) {
        // Objet WFS
        // var prop = f.getProperties();
        var geometryName = f.getGeometryName();
        att = f.layer.getFeatureType().attributes || {};
        for (i in prop) if (i !== geometryName) {
          _addLine(th, ul, (att[i]?att[i].title:i).replace(/_/g,' '), f.get(i), att[i]?att[i].type:'string');
        }
      }
      // select first theme
      if (saveTheme && $("."+saveTheme, th).length) $("."+saveTheme, th).click();
      else $('[class!="hidden"]', th).first().click();
    }
  }
  wapp.showPage('fiche');
  // Afficher le point si hors de l'ecran
  if (f)
  {	var e = this.map.getView().calculateExtent(this.map.getSize());
    if (!ol_extent_containsCoordinate(e, f.getGeometry().getFirstCoordinate()))
    {	this.map.getView().setCenter(f.getGeometry().getFirstCoordinate());
    }
  }
};



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
wapp.loadCache = function () {
  const hasCache = wapp.getCache(wapp.guichet);
  if (hasCache && hasCache.cache) {
    wapp.vectorCache.loadCache(hasCache.cache);
  }
};

/** Mise a jour du cache courant
 */
wapp.updateCache = function(layer) {
  wapp.message(
    'Mettre a jour les données du guichet.<br/><i>Cette opération peut être longue</i>',
    'Mise à jour', 
    { ok:'Mettre à jour', cancel:'annuler' },
    (b) => {
      if (b==='ok') {
        const hasCache = wapp.getCache(wapp.guichet);
        if (hasCache) {
          //wapp.vectorCache.updateCache(hasCache.cache)
          const layers = wapp.getLayerGuichet().getLayers().getArray().slice();
          wapp.vectorCache.saveLayer (layers, hasCache.cache);
        }
      }
    }
  );
};

/** Mettre a jour la carte
*/
$("#fiche").on("showpage hidepage", function() {
  wapp.map.updateSize();
});




export default wapp
