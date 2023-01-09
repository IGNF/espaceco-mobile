import ol_source_Report from 'cordovapp/ol/source/Report'
import CordovFile from 'cordovapp/cordovapp/File'
import getCacheFileName from 'cordovapp/cordovapp/File'
import reportStyle, { filterFeature } from './reportStyle'

import ol_layer_AnimatedCluster from 'ol-ext/layer/AnimatedCluster'
import ol_source_Cluster from 'ol/source/Cluster'

/** Calque des signalements 
 */
function layerReport(wapp) {
  const dir = 'FILE/cache-signalements/';
  const cache = {
    saveCache: function(response, tileCoord) {
      var fileName = dir+tileCoord.join('-');
      CordovFile.getDirectory(dir, 
        function() {
          getCacheFileName.write(
            fileName, 
            response
            // options.success,
            // options.error
          );
        }, 
        function(){},
        true
      );
    },
    loadCache: function(options) {
      console.log('logCache'); console.log(options);
      var fileName = dir + options.tileCoord.join('-');
      CordovFile.read(
        fileName, 
        options.success,
        options.error
      );
    }
  };

  // Calque des signalements
  var signalements = new ol_layer_AnimatedCluster({
    title: 'Signalements',
    name: 'Signalements',
    maxResolution: 30, //zoom 13
    zIndex: Infinity,
    source: new ol_source_Cluster({
      geometryFunction: (feature) => {
        if (filterFeature(feature)) return null;
        return feature.getGeometry(); 
      },
      source: new ol_source_Report({
        report: wapp.report
      }, cache),
      attributions: 'IGN'
    })
  });
  var lgroup = wapp.map.getLayers().getArray().find((l) => { return l.get('name') === 'signalementGroup' });
  lgroup.getLayers().insertAt(0, signalements);

  // Gestion visibilite
  wapp.toggleReport = function() {
    signalements.set('visible', !signalements.get('visible'));
  };
  signalements.on('change:visible', () => {
    if (signalements.get('visible')) $('#layer-signalement .report .fa-eye').removeClass('fa-eye-slash');
    else $('#layer-signalement .report .fa-eye').addClass('fa-eye-slash');
  });

  wapp.testHiddenLayer(signalements);

  signalements.setStyle(reportStyle(wapp));
  wapp.report.signalements = signalements;
}

export default layerReport
