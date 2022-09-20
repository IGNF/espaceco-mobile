import wapp from '../wapp';
import SketchTools from 'cordovapp/ripart/SketchTools';

import ol_layer_Vector from 'ol/layer/Vector'
import ol_source_Vector from 'ol/source/Vector'

$('#createupdateObj').on('click', function(){wapp.createupdateGeom();})

/**
 * Création, modification d'un objet sur une couche du guichet
 */
class CreateupdateObject {

    /**
     * constructeur 
     * @param {*} geomTypes  tableau contenant les types d'objets que l'on peut modifier ['Point','LineString', 'Polygon']
     */
    constructor(geomTypes) {
        this.ripart = wapp.ripart;
        this.drawInteraction = new SketchTools(this.ripart, geomTypes);
        this.selectedLayer = undefined;
    }
}


//instance de CreateupdateObject
var cuo = undefined;
var layType = {};


wapp.createupdateGeom = function (geomFilter) {
    
    geomFilter = geomFilter ? geomFilter : ['Point', 'LineString', 'Polygon'];

    
    var curColor = $("#createupdateObj").css('background-color').replace(/ /g, '');
    if (curColor == 'rgb(255,0,0)' && cuo) {
        cuo.drawInteraction.setActive(false);
        cuo == undefined;

        $("#layerToEdit").hide();
        $("#createupdateObj").css({ 'background-color': 'rgb(0,0,255)' });
    } else {
        
        $("#createupdateObj").css({ 'background-color': 'rgb(255,0,0)' });

        var layers = wapp.getLayerGuichet().getLayersArray();   // liste des layers du guichet
        // création de la liste déroulante des guichets
        $('#layerToEdit').empty()
            .append('<option selected="selected" value="-1">Couche de travail &#xf0d7;</option>')
            .show();
        for (let i = 0; i < layers.length; i++) {
            let geomType = layers[i].getSource().getFeatureType().attributes.geom.type;

            layType[layers[i].get('name')] = geomType;
            //@TODO vérifier si la couche est éditable  ==> nvlle API
            if (geomFilter.includes(geomType)) {
                $('#layerToEdit')
                .append($('<option>', {
                    value: layers[i].get('name'),
                    text: layers[i].getSource().getFeatureType().name
                }));
            } 
           
        }

        $('#layerToEdit').on('change', function () {
            
            if (cuo !== undefined){
                cuo.drawInteraction.setActive(false);
                for (const key in cuo) {
                    delete cuo[key];
                  }
            }
        
            var selLayerName = $('#layerToEdit').val();
           
            cuo = new CreateupdateObject([layType[selLayerName]]);

            if (selLayerName == -1) {
                cuo.selectedLayer = undefined;
            } else {
                for (let i = 0; i < layers.length; i++) {
                    if (selLayerName == layers[i].get('name')) {
                        cuo.selectedLayer = layers[i];
                        break;
                    }
                }
            }
            if (cuo.selectedLayer !== undefined) {

                showEditTool(cuo.selectedLayer, cuo.drawInteraction);
            }
        })
    }
}

wapp.createupdatePoint = function () {
    var self = this;
    console.log('createupdatePoint1');

    // var curColor = $("#createupdateObj").css('background-color').replace(/ /g, '');
    // if (curColor == 'rgb(255,0,0)') {
    //      cuo.drawInteraction.setActive(false);
    //      cuo == undefined;

    //      $("#layerToEdit").hide();
    //      $("#createupdateObj").css({ 'background-color': 'rgb(0,0,255)' });
    // } else {
    //     cuo = new CreateupdateObject(['Point']);
    //     $("#createupdateObj").css({ 'background-color': 'rgb(255,0,0)' });

    //     var layers = wapp.getLayerGuichet().getLayersArray();
    //     $('#layerToEdit').empty()
    //         .append('<option selected="selected" value="-1">Couche de travail &#xf0d7;</option>')
    //         .show();
    //     for (let i = 0; i < layers.length; i++) {
    //         let geomType = layers[i].getSource().getFeatureType().attributes.geom.type;
    //         if (geomType == "Point") {
    //             $('#layerToEdit')
    //                 .append($('<option>', {
    //                     value: layers[i].get('name'),
    //                     text: layers[i].getSource().getFeatureType().name
    //                 }));
    //         }
    //     }


    //     $('#layerToEdit').on('change', function () {
    //         var selLayerName = $('#layerToEdit').val();
    //         if (selLayerName == -1) {
    //             cuo.selectedLayer = undefined;
    //         } else {
    //             for (let i = 0; i < layers.length; i++) {
    //                 if (selLayerName == layers[i].get('name')) {
    //                     cuo.selectedLayer = layers[i];
    //                 }
    //             }
    //         }
    //         if (cuo.selectedLayer !== undefined) {

    //             showEditTool(cuo.selectedLayer,cuo.drawInteraction );
    //         }
    //     })



    //     ////
    //     //  // Calque pour la selection
    //     //  var selectOverlay = wapp.ripart.selectOverlay = new ol_layer_Vector({
    //     //     name: 'selectOverlay',
    //     //     source: new ol_source_Vector(),
    //     //     style:[
    //     //       new ol_style_Style ({
    //     //         image: new ol_style_Circle ({ stroke: whiteStroke, fill: redFill, radius: 5 }),
    //     //         stroke: whiteStroke,
    //     //         fill: redFill
    //     //       }),
    //     //       new ol_style_Style ({
    //     //         image: new ol_style_Circle ({ stroke: redStroke, radius: 5 }),
    //     //         stroke: redStroke
    //     //       })
    //     //     ]
    //     //   });
    //     //   selectOverlay.setMap(this.map);
    //     //   selectOverlay.getSource().on("addfeature", function(e){
    //     //     e.feature.layer = selectOverlay;
    //     //    // e.feature.unset('georem');
    //     //   });

    //     /////


    // }

}


/**
 * 
 * @param {*} layer 
 * @param {*} drawInteraction 
 */
function showEditTool(layer, drawInteraction) {
    var self = this;
    wapp.ripart.layer = layer;

    drawInteraction.setActive(false);
    drawInteraction.picker.removeButton('ol-button-modify');
    drawInteraction.tools.draw.on('drawend', (e) => {
        var draw = drawInteraction.tools.draw;
        if (e.feature && e.valid) {
            draw.removeButton('ol-button-cancel');
            var feature = cuo.ripart.addFeature(e.feature);
            draw.addButton({
                className: 'ol-button-cancel',
                click: () => {
                    cuo.ripart.addFeature(feature.added);
                    draw.removeButton('ol-button-cancel');
                }
            });
            draw.removeButton('ol-button-fiche');
            draw.addButton({
                className: 'ol-button-fiche',
                click: () => {
                    console.log('ouverture fiche');
                }
            });
        }
    });


    //cuo.ripart.layer.getSource().getFeatures()

    // drawInteraction.picker.removeButton('ol-button-add');
    /** Cancel tracking map mode */
    wapp.ripart.cancelTracking = function () {

        console.log('cancel');
        drawInteraction.setActive(false);
        $("#layerToEdit").hide();
        $("#createupdateObj").css({ 'background-color': 'rgb(0,0,255)' });

    };

    drawInteraction.setActive(true);

}

