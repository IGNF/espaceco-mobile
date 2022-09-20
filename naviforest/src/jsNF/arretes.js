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

  go(lat, lon, fo)
    .then(function (result) {
      var arrete = "";
    })
    .catch(function (error) {
      console.log('catch' + error);
      wapp.wait(false);
    });
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
  // return new Promise(function (resolve, reject) {
  //   wapp.wait("chargement ...");

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
        alert('https://naviforest.ign.fr/arretes/' + dep + '_arrete_transport_bois.pdf');
        // TODO  supprimer l'alert et décommenter ligne suvante (window.open ....) lorsque les arr^tés seront disponibles
        //window.open('https://naviforest.ign.fr/arretes/' + dep + '_arrete_transport_bois.pdf');
      } else {
        alert('https://naviforest.ign.fr/arretes/');
        // TODO  supprimer l'alert et décommenter ligne suvante (window.open ....) lorsque les arr^tés seront disponibles
        //window.open('https://naviforest.ign.fr/arretes/' );
      }
    })

    .fail(function (error) {
      alert("La requête s'est terminée en échec. Infos : " + JSON.stringify(error));
    })
    .always(function () {
      wapp.wait(false);
    });

}




