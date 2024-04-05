import wapp from '../wapp'

import {containsCoordinate as ol_extent_containsCoordinate} from 'ol/extent'
import {getCenter as ol_extent_getCenter} from 'ol/extent'
import ol_layer_Vector_CollabVector from 'cordovapp/ol/layer/CollabVector'
import {reportStatus} from 'cordovapp/report/Report'
import { Slider } from 'cordovapp/cordovapp/slider'
import { DocumentForm } from 'cordovapp/collaboratif/DocumentForm'
import 'cordovapp/cordovapp/slider.css'
import { Feature } from 'ol';
import moment from 'moment';
import { prettifyAxiosError } from 'cordovapp/collaboratif/errorHelper'

var slider, docForm;

/** Show Visibulle / thematics in the selection bar
 * @param {ol/Feature} f
 */
wapp.setVisibulle = function(f) {
  if (!f) {
    $('#selection').html(' ')
  } else if (f.layer && f.layer.get('table') && f.layer.get('table').thematic_ids) {
    const st = [];
    const table = f.layer.get('table');
    table.thematic_ids.forEach(k => {
      if (String(f.get(k))) {
        let strVal = f.get(k);
        st.push(strVal);
      }
    })
    
    // Display thematics 
    $('#selection').html (st.join('<br/>') || f.get('nom') || f.get('nature') || 'Afficher la sélection...');
  } else {
    // Default display
    $('#selection').html (f.get('nom') || f.get('nature') || 'Afficher la sélection...');
  }
}

/** Get title */
function getFeatureTitle(f) {
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
}

/* Add attribute line to the selection list
 * @param {Element} th container
 * @param {Elemen} ul the list
 * @param {string} title
 * @param {string} val
 */
function _addLine(th, ul, title, val, options) {
  options = options || {};
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
  if (className!=='hidden') className = 'att-'+className;
  if (theme && !$('.'+className, th).length) {
    $('<div>').addClass(className)
      .text(theme)
      .click(function() {
        $('div', th).removeClass('selected');
        $('.'+className, th).addClass('selected');
        $('li', ul).hide();
        $('.buttons', ul).show();
        $('.'+className, ul).show();
      })
      .appendTo(th);
  }
  // Add line
  var li = $("<li>").addClass(className).appendTo(ul);
  if (options.feature && options.feature._updates && options.feature._updates[options.attribute.name]) {
    li.addClass('updated');
  }
  switch (options) {
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
      if (options.attribute && options.attribute.listOfValues && !options.attribute.listOfValues.forEach) {
        var v = val;
        for (let i in options.attribute.listOfValues) {
          if (options.attribute.listOfValues[i]===val) v = i; 
        }
        val = v;
      }
      if (options.attribute && options.attribute.type.toLowerCase() === "like" && val && val.cnt) {
        val = val.cnt;
      }
      if (options.attribute && options.attribute.type.toLowerCase() === "document") {
        let url = docForm.getDocumentLink(val);
        if (url) slider.addImage(url, label);
        
        if (val && parseInt(val) != val) {
          val = val.substring(val.lastIndexOf("/")+1, val.lastIndexOf("?"));
        }
        $('<a>').text(val).appendTo(li).on('click', showSlider);
      } else {
        $("<span>").text(val)
        .appendTo(li);
      }

      break;
    }
  }
}

/**
 * affichage du slider
 */
function showSlider() {
  wapp.showPage('slider');
  slider.show()
}

/** Show a georem
 * @param {Element} div current Element
 * @param {*} georem
 * @param {boolean} newOne if not false add a delete button (c est la propriete report du feature lorsqu elle existe)
 */
function showGeorem(div, georem, newOne) {
  // pour une alerte existante le feature ne contient pas l info du nom de l auteur
  // il faut faire un get report pour recuperer l info du nom de l auteur
  // ne marche que si l utilisateur est connecte
  if (georem.id && !georem.complete && wapp.report.apiClient.isConnected()) {
    wapp.wait(true);
    wapp.report.apiClient.getReport(georem.id).then((response) => {
      wapp.wait(false);
      let report = response.data;
      georem.author = report.author;
      for (let i in report.replies) {
        report.replies[i].author_name = report.replies[i].author.username;
        report.replies[i].date = moment(report.replies[i].date).format('YYYY-MM-DD HH:mm:ss');
      }
      georem.replies = report.replies;
      georem.complete = report.complete = true;
      showGeorem(div, report, newOne);
    }).catch((error) => {
      wapp.wait(false);
      wapp.alert("Une erreur s'est produite lors de la récupération du signalement.");
    });
    return;
  }
  div.addClass("georem").removeClass("fiche");
  if (georem.sketch) {
    try {
      georem.nb = wapp.report.sketch2feature(georem.sketch).length;
    } catch (error) {
      wapp.wait(false);
      wapp.alert("Une erreur s'est produite lors de la récupération du signalement.");
    }
  }
  else georem.nb = 0;
  if (!georem.status) georem.status = ' ';
  georem.author_name = (georem.author && georem.author.username ) ? georem.author.username : ''

  georem.commune_name = georem.commune ? georem.commune.title : '';
  georem.id_dep = georem.departement ? georem.departement.name : '';
  georem.pretty_opening_date = georem.opening_date ? moment(georem.opening_date).format('YYYY-MM-DD HH:mm:ss') : '';
  
  georem.attText = typeof georem.attributes === 'string' ? georem.attributes : '';
  if (typeof georem.attributes != 'string') {
    for (var i in georem.attributes) {
      let att = georem.attributes[i].attributes;
      let group = wapp.userManager.getGroupById(georem.attributes[i].community);
      georem.attributes[i].community_name = group ? group.name : "community: "+georem.attributes[i].community;
      for (var key in att) {
        georem.attText += key+": "+att[key]+"\n";
      }
    }
  }
  
  georem.attText = georem.attText.trim();

  $('img.photo', div).each(function(i) {
    $(this).attr('src', '');
  });
  for (let i in georem.photos) {
    let count = i;
    count++;
    $('.photo.img'+count).attr('src', georem.photos[i]).show();
  }

  const georemDiv = $(".georem", div);
  // Show attributes
  wapp.dataAttributes(georemDiv, georem);
  // Set response status code > text
  for (let k in reportStatus) {
    $('.'+k+' span', div).text(reportStatus[k]);
  }
  // Reply
  const replyBt = $('button.response', georemDiv).off();
  if (wapp.report.canReply(georem)) {
    var isok;
    switch (georem.status) {
      case 'submit':
      case 'pending':
      case 'pending0':
      case 'pending1': {
        isok = true;
        break;
      }
      default: {
        isok = false;
        break;
      }
    }
    if (isok) {
      replyBt.show();
      if (georem.responses) replyBt.addClass('disabled');
      else replyBt.removeClass('disabled');
      replyBt.click(() => {
        if (georem.responses) {
          wapp.alert (
            '<i class="fa fa-warning fa-fleft fa-2x"></i>Envoyez cette réponse avant d\'en créer ne nouvelle.',
            'Une réponse en attente...'
          );
        }
        wapp.report.addLocalRep(georem, {
          cback: () => {
            showGeorem(div, georem, newOne);
          }
        });
      });
    } else {
      replyBt.hide();
    }
    // Local responses
    const resp = wapp.report.getLocalReps(georem);
    const ul = $('.localRep', div);
    const tmp = $('[data-role="template"]', ul);
    ul.html('').append(tmp);
    resp.forEach((r) => {
      const li = $("<li>").html(tmp.html()).appendTo(ul);
      if (!isok || r.error) li.addClass('error');
      $('.status', li).addClass(r.status).text(reportStatus[r.status] || 'Réponse');
      $('.content', li).text(r.content);
      $('.sendrep', li).click(() => {
        if (navigator.connection.type == Connection.NONE) {
          wapp.alert("Envoi impossible, merci de réessayer quand l'application sera de nouveau connectée au réseau.");
          return;
        }
        wapp.wait('Envoi en cours...')
        wapp.report.postLocalRep(georem, r, {
          cback: (georem, error) => {
            showGeorem(div, georem, newOne);
            wapp.wait(false);
            if (error) {
              var msg = "Impossible d'envoyer la réponse.<br/>";
              let prettyError = prettifyAxiosError(error);
              $("<i>").addClass('error')
                .html("<br/>Erreur : "+ prettyError['code'] + ":" + prettyError['message'] +"</i>")
                .appendTo(msg);
              wapp.alert(msg);
            }
          }
        });
      });
      $('.delrep', li).click(() => {
        wapp.report.delLocalRep(georem, r, {
          cback: () => {
            showGeorem(div, georem, newOne);
          }
        });
      })
    });
  } else {
    replyBt.hide();
  }
  if (newOne) $(".georem .del", div).hide();
  else $(".georem .del", div).show();
}

/** Objet d'un guichet 
 * @param {Element} ul
 * @param {ol.Feature} f
 * @param {Element} th theme element
 */
function showFeature(ul, f, th) {
  // Objet d'un guichet
  const isEdit = wapp.isCordova && !f.layer.getTable().read_only && f.layer.get('role').indexOf('edit') != -1;
  if (isEdit) {
    $('.edit', ul.parent()).show();
  }
  ul.parent().removeClass('edition');
  var table = f.layer.getSource().table_;
  slider = new Slider($("#slider"));
  docForm = new DocumentForm(wapp);
  for (let i in table.columns) if (i !== table.geometry_name) {
    let att = table.columns[i];
    switch (att.type) {
      case "Point":
      case "LineString":
      case "Polygon":
      case "MultiPolygon":
        break;
      default: {
        _addLine(
          th, ul, 
          att.title, 
          f.get(i), {
            feature: f, 
            attribute: att,
            edit: (isEdit && i !== table.id_name && !att.read_only)
          }
        );
        break;
      }
    }
  }
}

/** Objet WMS 
 * @param {Element} ul
 * @param {ol.Feature} f
 * @param {Element} th theme element
 */
function showWMSFeature(ul, f, th) {
  // Objet WMS
  var visu = f.layer.get("getFeatureInfoMask").visu;
  for (let i in visu) {
    _addLine(th, ul, visu[i].replace(/_/g,' '), f.get(i));
  }
}

/** Objet WFS 
 * @param {Element} ul
 * @param {ol.Feature} f
 * @param {Element} th theme element
 */
function showWFSFeature(ul, f, th) {
  const prop = f.getProperties();
  const geometryName = f.getGeometryName();
  const att = f.layer.getTable().columns || {};
  for (let i in prop) if (i !== geometryName) {
    _addLine(th, ul, (att[i]?att[i].title:i).replace(/_/g,' '), f.get(i), att[i]?att[i].type:'string');
  }
}

/** Afficher la fiche
 * @param {any}  options
 *	@param {bool} options.report true si vient de la page de remontees 
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
      if (f.layer !== wapp.report.croquis) features.push(f);
    }
  });
  var nb = features.length;

  // Ne pas passer par le liste
  options.index = options.index || 0;

  // Current feature
  if (options.index && options.index>=nb) options.index = 0;
  if (options.index && options.index<0) options.index = nb-1;
  var f = features[options.index || 0];

  if (options.report) $("#fiche").addClass("fromReport");
  else $("#fiche").removeClass("fromReport");

  var div = $('#fiche .selection').removeClass("georem fiche trace multi");
  div.get(0).scrollTop = 0;
  var i, ul, th;

  // Pas de selection
  if (options.index===undefined && nb>1) {
    div.addClass("fiche");
    $(".fiche h3", div).html(nb+' objets sélectionnés :');
    $(".fiche img.guichet", div).hide();
    ul = $(".fiche ul", div).html('');
    th = $(".fiche .themes", div).html('');
    i = 0;
    this.select.getFeatures().forEach (function(f){
      $('<li>').html(getFeatureTitle(f))
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
    // Visibule
    wapp.setVisibulle(f)
    // Properties
    var prop = f.getProperties();
    var georem = prop.georem || prop.report;
    // Hide edition
    $('.edit').hide();
    // Georem
    if (georem) {
      // Croquis ?
      if (georem instanceof Feature) {
        showGeorem(div, georem.get('georem'), prop.report);
      } else {
        showGeorem(div, georem, prop.report);
      }
    } else {
      // Fiche de l'objet
      div.addClass("fiche");
      // Layer de l'objet
      $(".fiche h3", div).text(f.layer.get("title")||f.layer.get("name"));
      if (f.layer.get("logo")) {
        $(".fiche img.guichet", div).attr('src', f.layer.get("logo")).show();
      } else {
        $(".fiche img.guichet", div).hide();
      }
      var saveTheme =  $(".fiche .themes .selected", div).removeClass('selected').attr('class');
      ul = $(".fiche ul", div).html('');
      ul.addClass("read-only");
      th = $(".fiche .themes", div).html("");

      // Trace GPS
      if (f.layer.get('geolocation')) {
        div.addClass("trace");
      } else 
      // GUICHET
      if (f.layer instanceof ol_layer_Vector_CollabVector) {
        showFeature(ul, f, th);
      } else 
      // WMS
      if (f.layer.get("getFeatureInfoMask")) {
        showWMSFeature(ul, f, th);
      } else 
      // WFS
      if (f.layer.getTable) {
        showWFSFeature(ul, f, th);
      }

      // select first theme
      if (saveTheme && $("."+saveTheme, th).length) $("."+saveTheme, th).click();
      else $('[class!="hidden"]', th).first().click();
    }
  }
  if ($('.fiche .themes [class!="hidden"]', div).length > 0) {
    div.addClass('themes');
  } else {
    div.removeClass('themes');
  }
  wapp.showPage('fiche');
  
  // Centrer sur le point si hors de l'ecran
  if (f) {
    var e = this.map.getView().calculateExtent(this.map.getSize());
    const pt = f.getGeometry().getClosestPoint(ol_extent_getCenter(e));
    if (!ol_extent_containsCoordinate(e, pt)) {
      this.map.getView().setCenter(pt);
    }
  }
};
