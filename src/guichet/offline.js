import CordovApp from 'cordovapp/CordovApp';
import ol_layer_Vector from 'ol/layer/Vector';
import ol_source_Vector from 'ol/source/Vector';
import {singleClick as ol_condition_singleClick} from 'ol/events/condition';
import CacheExtents from 'cordovapp/ol/cache/CacheExtents';
import CollabVector from 'cordovapp/ol/layer/CollabVector';
import { selectDialog } from 'cordovapp/cordovapp/dialog';
import wapp from '../wapp';

var extentLayer;
var currentGuichet;
var cacheExtentPage;
var offlinePage;

var cacheExtents;

//on cache le switch mode si aucune couche hors ligne definie
var manageToggleVis = function() {
    let $menu =$('[data-template="principal"]');
    let currentGuichet = wapp.vectorCache.getCurrentGuichet();
    const hasVectorCache = wapp.getCache(currentGuichet);
    let smaps = wapp.param.cacheMap ? wapp.param.cacheMap : [];
    (smaps.length || hasVectorCache.cache) ? $menu.addClass("hasCache") : $menu.removeClass("hasCache");
}

var refreshCacheAreas = function(domId, hasCache) {
    // zones utilisees par le cache guichet
    $(domId).empty();

    if (hasCache.cache) {
        for (var i in hasCache.cache.extentNames) {
            let $p = $("<span></span>").addClass("area").html(hasCache.cache.extentNames[i]);
            $("#vector-cache-area").append($p);
        }
    }
}

var refreshCacheExtentsList = function(domId) {
    // Affichage des zones
    $(domId).empty();
    let cacheExtentsList = cacheExtents.get();
    for (var name in cacheExtentsList) {
        let div = getCacheExtentHtml(name);
        div.appendTo(domId);
    }
}

var refreshCacheLayersList = function(domId, cache) {
    $(domId).empty();
    if (!cache) return;

    var cacheLayers = cache.layers;
    for (let i in cacheLayers) {
        let div = getCacheLayerHtml(cacheLayers[i], cache);
        div.appendTo(domId);
    }
}

// creation d un element pour la liste des zones
var getCacheExtentHtml = function(name) {
    let div = $("<div>", {
        class: "cache-extent"
    });
    $("<p>", {
        class: "cache-extent-name",
        text: name,
        click: function() {
            cacheExtentPage.attr('data-type', 'view');
            cacheExtentPage.attr('data-name', name);
            wapp.showPage(cacheExtentPage.attr('id'));
        }
    }).appendTo(div);
    $("<i>", {
        class: "fa fa-trash",
        click: function() {
            cacheExtents.remove(name);
            refreshCacheExtentsList("#cache-extents-list");
        }
    }).appendTo(div);
    return div;
}

var getCacheLayerHtml = function(layer, cache) {
    let vectorLayer = null;
    wapp.getLayerGuichet().getLayersArray().forEach((l, i) => {
        if (l.get('name') && layer.table && l.get("name") == layer.table.full_name) vectorLayer = l;
    });
    let circleClass="fa fa-circle";
    if (cache.loaded) circleClass += ' loaded';
    let div = $("<div>", {
        class: "cache-layer"
    });
    $(`<p><i class="${circleClass}"></i> ${layer.table.name}</p>`).appendTo(div);

    if (cache.loaded) {
        $("<i>", {
            class: "fa fa-refresh",
            click: function() {
                wapp.updateCache(vectorLayer);
            }
        }).appendTo(div);
    }

    $("<i>", {
        class: "fa fa-trash",
        click: function() {
            if (!vectorLayer) { // le cache n est pas encore charge
                for (let i in cache.layers) {
                    if (cache.layers[i].name == layer.name) {
                        cache.layers.splice(i, 1);
                        refreshCacheLayersList(".layerlist", cache);
                        return;
                    }
                }
                return;
            }

            let cbk = (success) => {
                if (!success) {
                    wapp.alert("Echec de la suppression");
                } else {
                    refreshCacheLayersList(".layerlist", cache);
                }
            }
            if (cache.layers.length > 1) {
                wapp.vectorCache.removeLayerCache(cache, vectorLayer, cbk);
            } else {
                wapp.vectorCache.removeCache(cache);
                wapp.hidePage();
            }
        }
    }).appendTo(div);
    return div;
}

var redrawExtent = function() {
    let name = cacheExtentPage.attr("data-name");
    extentLayer.set('cache-extent', name);
    cacheExtents.center(name);
}

function initOffline(wapp) {
    cacheExtents = new CacheExtents(wapp);
    cacheExtentPage = $("#cacheExtent");
    offlinePage = $("#offline");
    wapp.param.online = (typeof wapp.param.online != "undefined") ? wapp.param.online : true;
    wapp.switchLayersOnline(wapp.param.online);

    wapp.saveParam();

    // gestion de la page cacheExtent
    cacheExtentPage.on("showpage", function() {
        if(!extentLayer) {
            extentLayer = new ol_layer_Vector({
                title: 'extent',
                displayInLayerSwitcher: false,
                source: new ol_source_Vector()
            });
            wapp.map.addLayer(extentLayer);
            cacheExtents.addPostcompose(extentLayer, 'cache-extent');
        }

        const guichet = wapp.getLayerGuichet();

        let type = cacheExtentPage.attr("data-type");
        if (type == "select-obj") {
            guichet.setVisible(true);
            let layerIndex = cacheExtentPage.attr("data-layer");
            let guichetLayers = guichet.getLayers().getArray();
            let layer = guichetLayers[layerIndex];
            for (var i in guichetLayers) {
                if (i != layerIndex) guichetLayers[i].setVisible(false);
            }
            layer.setVisible(true);
        } else {
            guichet.setVisible(false);
        }

        extentLayer.setVisible(true);
        redrawExtent();
    });

    $('.close', cacheExtentPage).on("click", () => {
        let name = cacheExtentPage.attr('data-name');
        let type = cacheExtentPage.attr("data-type");
        if (type == 'custom' && !cacheExtents.get(name).length) {
            cacheExtents.addExtent(name, wapp.map.getView().calculateExtent(wapp.map.getSize()));
        }

        wapp.select.getFeatures().clear();
        extentLayer.setVisible(false);

        const guichet = wapp.getLayerGuichet();
        guichet.setVisible(true);

        wapp.hidePage();
        wapp.showPage('offline');
    });

    $('.add', cacheExtentPage).on("click", () => {
        let name = cacheExtentPage.attr('data-name');
        let type = cacheExtentPage.attr("data-type");
        if (type == "select-obj") {
            wapp.select.getFeatures().forEach(feature => {
                cacheExtents.addExtent(name, feature.getGeometry().getExtent());
            });
            wapp.select.getFeatures().clear();
        } else {
            cacheExtents.addExtent(name, wapp.map.getView().calculateExtent(wapp.map.getSize()));
            wapp.map.getView().setZoom(wapp.map.getView().getZoom()-1);
        }
        redrawExtent();
    });

    offlinePage.on("hidepage", function() {
        manageToggleVis();
    })

    // onglet de gestion du mode hors ligne
    offlinePage.on("showpage", function() {
        refreshCacheExtentsList("#cache-extents-list");

        // gestion activation boutons cache guichet
        currentGuichet = wapp.vectorCache.getCurrentGuichet();
        const hasCache = wapp.getCache(currentGuichet);
        refreshCacheLayersList('.layerlist', hasCache.cache);
        refreshCacheAreas("#vector-cache-area", hasCache);

        if (!currentGuichet) {
            $("#add-cache-layer-btn").prop("disabled", true);
            $("#remove-cache-layer-btn").prop("disabled", true);
            $(".cache-tools", offlinePage).hide();
        }

        if (hasCache.cache) {
            $("#remove-cache-layer-btn").prop("disabled", false);
            $("#load-cache-layer-btn").prop("disabled", hasCache.cache.loaded);
            if (hasCache.cache.loaded) {
                $(".cache-tools", offlinePage).show();
                $(".areas", offlinePage).show();
            } else {
                $(".cache-tools", offlinePage).hide();
                $(".areas", offlinePage).hide();
            }
        } else {
            $(".areas", offlinePage).hide();
            $("#remove-cache-layer-btn").prop("disabled", true);
            $(".cache-tools", offlinePage).hide();
        }

        let hasPendingMap = false;
        let smaps = wapp.param.cacheMap ? wapp.param.cacheMap : [];
        for (let i in smaps) {
            if (smaps[i].pending) {
                hasPendingMap = true;
                break;
            }
        }

        $("#load-cache-ign-layer-btn").prop("disabled", !hasPendingMap);
    });

    // ajout d'une nouvelle zone
    $("#add-cache-extent-btn", offlinePage).on("click", function(){
        let content = CordovApp.template("dialog-cache-extent");

        var list = $('li[data-param="layer"]', content);
        const guichet = wapp.getLayerGuichet();
        for (var i=0, l; l = guichet.getLayers().getArray()[i]; i++) {
            if (l instanceof CollabVector && typeof l.getTable == 'function' && l.getTable()) {
                let table = l.getTable();
                let geomType = table.columns[table["geometry_name"]].type;
                if (geomType.indexOf("Polygon") == -1) continue; // on filtre les couches non surfaciques
                $("<div>")
                    .attr('data-input-role', 'option')
                    .attr('data-val', i)
                    .addClass('layer')
                    .text(l.get('title'))
                    .appendTo(list);
            }
        }
        $('[data-input-role="option"]:first', list).attr('data-default', 'true');

        wapp.setParamInput(content, {}, function(params){
            if (params.name == "type" && params.val == "select-obj") {
                $('#dialog-cache-extent .layer-input').addClass("visible");
            } else if (params.name == "type") {
                $('#dialog-cache-extent .layer-input').removeClass("visible");
            }
        });

        let cacheExtentsLength = Object.keys(cacheExtents.get()).length;
        let number = parseInt(cacheExtentsLength) + 1;
        $('.name', content).val("Zone"+number);
        $('[data-val="select-obj"]').on("change")
        wapp.dialog.show(content, {
            title: "Définir la zone",
            buttons: { ajouter:"Ajouter", cancel:"Annuler" },
            className: "attributes",
            callback: function(b) {
                if (b=='ajouter') {
                    if ($('.type.selected', content).attr('data-val') == "select-obj" && !$('.layer.selected', list).attr('data-val')) {
                        wapp.alert("Aucun guichet sélectionné");
                        return;
                    }
                    cacheExtentPage.attr('data-name', $('.name', content).val());
                    cacheExtentPage.attr('data-type', $('.type.selected', content).attr('data-val'));
                    cacheExtentPage.attr('data-layer', $('.layer.selected', list).attr('data-val'));
                    wapp.showPage(cacheExtentPage.attr('id'));
                }
            }
        });
    });

    //boutons de gestion du cache guichet
    $(".add-area", offlinePage).on("click", function(){
        let cache = wapp.getCache(wapp.guichet).cache;
        wapp.vectorCache.currentCache = cache;

        let extentsNames = cacheExtents.getExtentNames();
        let extentsNamesWithoutUsed = {};
        for(var name in extentsNames) {
            if (cache.extentNames.indexOf(name) == -1) extentsNamesWithoutUsed[name] = name;
        }
        if (Object.keys(extentsNamesWithoutUsed).length == 0) {
            wapp.alert("Aucune zone disponible");
            return;
        }
        selectDialog(
            extentsNamesWithoutUsed,
            extentsNamesWithoutUsed[0],
            function(selected) {
                wapp.vectorCache.uploadCache(false, selected);
                let $p = $("<span></span>").addClass("area").html(selected);
                $('#vector-cache-area').append($p);
            },
            {'title': 'Choisir une zone'}
        );
    });

    $("#refresh-all-btn", offlinePage).on("click", function(){
        let layers = wapp.getLayerGuichet().getLayers().getArray();
        for (let i in layers) {
          if (typeof layers[i].getSource().nbModifications == 'function' && layers[i].getSource().nbModifications()) {
            wapp.alert("Impossible de rafraîchir le cache car des modifications sont en cours sur une des couches.");
            return;
          }
        }
        wapp.updateCache();
    });

    $("#remove-cache-layer-btn", offlinePage).on("click", function(){
        wapp.vectorCache.removeCache(wapp.getCache(wapp.guichet).cache);
        wapp.hidePage();
    });

    $("#add-cache-layer-btn", offlinePage).on("click", function(){
        wapp.saveContext();
        var cache = wapp.getCache(wapp.guichet).cache;
        var content = CordovApp.template('dialog-guichet');
        var ul = $('ul.layerselect', content);
        let layerNames = cache ? cache.layers.map(l => l.nom) : [];
        if (!wapp.guichet.layers) {
            wapp.alert("Aucun guichet sélectionné");
            return;
        }
        for (var i=0, l; l = wapp.guichet.layers[i]; i++) {
            if (!l.table || (cache && layerNames.indexOf(l.table.name) != -1)) continue;
            if (l.table && l.table.tile_zoom_level) {
            $("<li>").addClass('selected')
                .attr('data-input','')
                .text(l.table.name)
                .data('layer', l)
                .click(function(){
                    var li = $(this).toggleClass('selected').addClass('active');
                    setTimeout (function(){
                        li.removeClass('active');
                    }, 200);
                })
                .appendTo(ul);
            }
        }

        // All/none
        $('.all', content).click(()=>{
            $('li', ul).each(function(){
            $(this).addClass('selected');
            })
        })
        $('.none', content).click(()=>{
            $('li', ul).each(function(){
            $(this).removeClass('selected');
            })
        });

        wapp.dialog.show (content, {
            title: "Ajouter des couches à charger",
            buttons: { valid:"Valider", cancel:"Annuler" },
            className: "attributes guichet",
            callback: function(b) {
                if (b=='valid') {
                    var layers = [];
                    $("li", ul).each(function() {
                        var l = $(this).data('layer');
                        if ($(this).hasClass('selected')) layers.push($.extend({},l));
                    });
                    if (!cache) {
                        wapp.vectorCache.addCache('Sans titre', layers);
                        offlinePage.trigger("showpage");
                    } else if (!cache.loaded) {
                        for(let i in layers) {
                            cache.layers.push(layers[i]);
                        }
                        offlinePage.trigger("showpage");
                    } else {
                        for(let i in layers) {
                            wapp.appendLayerToCache(layers[i]);
                        }
                        wapp.hidePage();
                    }
                }
            }
        });
    });

    /**
     * chargement du cache vecteur sur une zone donnee 
     * @param string extentName le nom de la zone a charger
     */ 
    
    var loadVectorCache = function(extentName) {
        var cache = wapp.getCache(wapp.guichet).cache;
        let extents = null;
        if (extentName) {
            extents = cacheExtents.get(extentName);
        }
        if (!cache) {
            wapp.alert("Choisir des couches à charger.");
            return;
        } else if (!extents || extents.length == 0) {
            wapp.alert("Choisir une zone de chargement du cache.");
            return;
        }
        wapp.vectorCache.currentCache = cache;
        wapp.vectorCache.uploadCache(false, extentName);
        wapp.hidePage();
    }

    // clic sur le bouton de chargement de cache vecteur
    // si aucune zone erreur, si une zone chargement direct
    // si plusieurs zones dialogue de choix
    $("#load-cache-layer-btn", offlinePage).on("click", function(){
        let extentsNames = cacheExtents.getExtentNames();
        if (Object.keys(extentsNames).length == 0) {
            wapp.alert("Vous devez saisir une zone pour le chargement du cache");
        } else if (Object.keys(extentsNames).length == 1) {
            let $p = $("<span></span>").addClass("area").html(Object.keys(extentsNames)[0]);
            $('#vector-cache-area').empty().html($p);
            loadVectorCache(Object.keys(extentsNames)[0]);
        } else {
            selectDialog(
                extentsNames,
                extentsNames[0],
                function(selected) {
                    let $p = $("<span></span>").addClass("area").html(selected);
                    $('#vector-cache-area').html($p);
                    loadVectorCache(selected);
                },
                {'title': 'Choisir une zone'}
            );
        }
    });

    //ajout d'une carte en cache
    $("#add-cache-ign-layer-btn", offlinePage).on("click", function(){
        wapp.cache.addCacheMap(wapp.param.options.mode === 'expert').then((smap) => {
            let extentsNames = cacheExtents.getExtentNames();
            if (Object.keys(extentsNames).length == 1) {
                let cbk = function() {
                    
                }
                wapp.cache.setCurrentMap(smap);
                wapp.cache.loadMapDlg(Object.keys(extentsNames)[0], false, cbk);
            }
        });

        
    });

    //chargement des cartes en attente
    $("#load-cache-ign-layer-btn", offlinePage).on("click", function(){
        var downloadCacheMap = function() {
            var cachePending = null;
            for (var i=0, c; c=wapp.param.cacheMap[i]; i++) {
                if (c.pending) {
                    cachePending = c;
                    break;
                }
            }

            if (!cachePending) {
                wapp.cache.silentErrors = false;

                //a la fin on affiche les erreurs
                let content = $("<div>");
                let hasErrors = Boolean(Object.keys(wapp.cache.errors).length);
                for (var i in wapp.cache.errors) {
                    let cacheMap = wapp.cache.getCacheMapById(i);
                    let $title = $("<b>"+cacheMap.nom+"</b>");
                    let $msg = $("<p>"+wapp.cache.errors[i].msg+"</p><br />");
                    content.append($title, $msg);
                }

                if (!hasErrors) {
                    wapp.dialog.show("Chargement terminé avec succès",
                    {buttons: {"close": "Ok"}});
                } else {
                    wapp.dialog.show(content, {
                        title: "Erreurs de chargement",
                        buttons: { ok: "Ok" }
                    })
                }
                return;
            }

            if (!wapp.cache.setCurrentMap(cachePending)) return;
            let downloadArgs = Object.values(cachePending.pending);
            delete cachePending.pending;
            downloadArgs.push(downloadCacheMap)
            wapp.cache.downloadMap(...downloadArgs);
        };

        wapp.cache.silentErrors = true;
        downloadCacheMap();
    });

    manageToggleVis();
}

export default initOffline;
