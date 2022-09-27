import wapp from '../wapp';
import { toLonLat } from 'ol/proj';


/**
 * Recherche et affichage de l'arrêté du département dans lequel on se trouve
 */
wapp.getArrete = function () {
  wapp.toggleMenu();

  let center = wapp.map.getView().getCenter();
  var lonlat = toLonLat(center);
  var lat = lonlat[1];
  var lon = lonlat[0];

  var fo = {};
  var rayon = 1000;   //on cherche dans un rayon de 1000m)
  if (rayon) {
    fo.circle = {
      x: lat,
      y: lon,
      radius: rayon
    };
  }

  go(lat, lon, fo);
  
}



/**
 * On utilise l'api-adresse.data.gouv.fr pour faire un geocodage inverse et 
 * retrouver le code département du centre de la carte
 * @param {*} lat   latitude du centre de la carte
 * @param {*} lon   longitude du centre de la carte
 * @param {*} fo    objet (cercle,  centre et rayon donnés)
 * @returns 
 */
function go(lat, lon, fo) {

  //non utilisé
  // var params = 'searchgeom={"type":"Circle","coordinates":[' + lat + ',' + lon + '],"radius":100}&' +
  //   'lon=' + lon + '&lat=' + lat +
  //   'index=poi&category=département&limit=1';
  var urlNaviforest = "https://naviforest.ign.fr/arretes/";
  var depArrete =  '_arrete_transport_bois.pdf'

  $.ajax({
    //L'URL de la requête 
    //  url: "https://wxs.ign.fr/essentiels/geoportail/geocodage/rest/0.1/reverse?"+ 
    //         params,
    url: "https://api-adresse.data.gouv.fr/reverse/?lon=" + lon + "&lat=" + lat,
    method: "GET",
    dataType: "json",
  })
    .done(function (response) {
      let data = JSON.stringify(response);
      if (response.features.length > 0) {
        let dep = response.features[0].properties.context.substr(0, 2);
        //depArrete = dep + '_arrete_transport_bois.pdf'
        alert(urlNaviforest + depArrete);
        // TODO  supprimer l'alert et décommenter ligne suvante (window.open ....) lorsque les arr^tés seront disponibles
        window.open(urlNaviforest + '33' +depArrete);
      } else {
        alert(urlNaviforest);
        // TODO  supprimer l'alert et décommenter ligne suvante (window.open ....) lorsque les arr^tés seront disponibles
        //window.open(urlNaviforest );
        window.open(urlNaviforest +depArrete);
      }
    })

    .fail(function (error) {
      alert("La requête s'est terminée en échec. Infos : " + JSON.stringify(error));
    })
    .always(function () {
      wapp.wait(false);
    });

}




