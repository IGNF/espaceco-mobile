import CordovApp from 'cordovapp/CordovApp';
import ol_layer_Vector from 'ol/layer/Vector';
import ol_source_Vector from 'ol/source/Vector';
import {singleClick as ol_condition_singleClick} from 'ol/events/condition';
import CacheExtents from 'cordovapp/ol/cache/CacheExtents';
import { selectDialog } from 'cordovapp/cordovapp/dialog';

var extentLayer;
var currentGuichet;
var cacheExtentPage;
var offlinePage;
var cacheExtentSelectInteraction;

var cacheExtents;

var refreshCacheExtentsList = function(domId) {
    // Affichage des zones
    $(domId).empty();
    let cacheExtentsList = cacheExtents.get();
    for (var name in cacheExtentsList) {
        let div = getCacheExtentHtml(name);
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
    $("<button>", {
        class: "fa fa-trash",
        click: function() {
            cacheExtents.remove(name);
            refreshCacheExtentsList("#cache-extents-list");
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
    wapp.param.online = true;

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
        wapp.select.getFeatures().clear();
        extentLayer.setVisible(false);
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


    // onglet de gestion du mode hors ligne
    offlinePage.on("showpage", function() {
        refreshCacheExtentsList("#cache-extents-list");

        // gestion activation boutons cache guichet
        currentGuichet = wapp.vectorCache.getCurrentGuichet();
        const hasCache = wapp.getCache(currentGuichet);
        $('.layerlist', offlinePage).empty();

        if (!currentGuichet) {
            $("#add-cache-layer-btn").prop("disabled", true);
            $("#remove-cache-layer-btn").prop("disabled", true);
        }
        
        if (hasCache.cache) {
            var cacheLayers = hasCache.cache.layers;
            for (let i in cacheLayers) {
                $('.layerlist', offlinePage).append(`<p>${cacheLayers[i].nom}</p>`)
            }
            $("#add-cache-layer-btn").prop("disabled", true);
            $("#remove-cache-layer-btn").prop("disabled", false);
        } else {
            $("#add-cache-layer-btn").prop("disabled", false);
            $("#remove-cache-layer-btn").prop("disabled", true);
        }
    });

    // ajout d'une nouvelle zone
    $("#add-cache-extent-btn", offlinePage).on("click", function(){
        let content = CordovApp.template("dialog-cache-extent");
        
        var list = $('li[data-param="layer"]', content);
        const guichet = wapp.getLayerGuichet();
        for (var i=0, l; l = guichet.getLayers().getArray()[i]; i++) {
            if (typeof l.getFeatureType == 'function' && l.getFeatureType()) {
                let ft = l.getFeatureType();
                let geomType = ft.attributes[ft.geometryName].type;
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
        $('[data-val="select-obj"').on("change")
        wapp.dialog.show(content, {
            title: "Définir la zone",
            buttons: { ajouter:"Ajouter", cancel:"Annuler" },
            className: "attributes",
            callback: function(b) {
                if (b=='ajouter') {
                    cacheExtentPage.attr('data-name', $('.name', content).val());
                    cacheExtentPage.attr('data-type', $('.type.selected', content).attr('data-val'));
                    cacheExtentPage.attr('data-layer', $('.layer.selected', list).attr('data-val'));
                    wapp.showPage(cacheExtentPage.attr('id'));
                }
            }
        });
    });

    //boutons de gestion du cache guichet
    $(".config-btn", offlinePage).on("click", function(){
        wapp.showPage('layer-guichet');
    });

    $("#remove-cache-layer-btn", offlinePage).on("click", function(){
        wapp.message(
            'Voulez-vous supprimer les données en cache ?<br/><i>Les saisies en cours seront perdues...</i>',
            'Supprimer',
            { ok: 'ok', cancel: 'Annuler' },
            (button) => {
            if (button==='ok') {
                wapp.vectorCache.removeCache(wapp.getCache(wapp.guichet).cache);
                wapp.hidePage();
            }
            }
        );
    });

    $("#add-cache-layer-btn", offlinePage).on("click", function(){
        wapp.saveContext();
        var cache = wapp.getCache(wapp.guichet).cache;
        if (!cache) {
            wapp.toggleMenu();
            wapp.vectorCache.addDialog(() => {
                let extentsNames = cacheExtents.getExtentNamesPlusNew();
                selectDialog(
                    extentsNames, 
                    'new', 
                    function(selected) {
                        cache = wapp.getCache(wapp.guichet).cache;
                        if (selected == 'new') {
                            wapp.loadCache(cache);
                        } else {
                            wapp.vectorCache.currentCache = cache;
                            let extents = cacheExtents.get(selected);
                            wapp.vectorCache.uploadCache(false, extents);
                        }
                    },
                    {'title': 'Choisir une zone'}
                );
            });
        }
    });

    //ajout d'une carte en cache
    $("#add-cache-ign-layer-btn", offlinePage).on("click", function(){
        wapp.cache.addCacheMap(wapp.param.options.mode === 'expert');
    });
}

export default initOffline;
