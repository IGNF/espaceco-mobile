import wapp from '../wapp';
import { toLonLat } from 'ol/proj';
import * as Gp from './GpServices.js';


wapp.getArrete = function (n) {  
  //wapp.wait("chargement ...");
 // window.open = cordova.InAppBrowser.open;
  
  wapp.toggleMenu();

 
  let center =wapp.map.getView().getCenter();
  var lonlat = toLonLat(center);
  var lat = lonlat[1];
  var lon = lonlat[0];

  var fo = { } ;
  var rayon= 1000;
  if (rayon) {
    fo.circle= {
        x: lat,
        y: lon,
        radius: rayon
    } ;
  }
 

   go(lat,lon,fo)
    .then(function(result) {
      console.log('then');
     var arrete ="";
    
      if (result.locations.length > 0) {
        let nodep =result.locations[0].placeAttributes.department;
        arrete = "https://naviforest.ign.fr/arretes/" + nodep + "_arrete_transport_bois.pdf ";
         console.log(arrete);
       
        }
   
        window.open("https://naviforest.ign.fr", "_system");
     
      
    })
    .catch(function(error) {
      
     console.log('catch' + error);
      wapp.wait(false);
    });

}



function go(lat,lon,fo) {

   
    return new Promise(function(resolve, reject) {
      wapp.wait("chargement ...");
      Gp.Services.reverseGeocode({
        position: {
          x: lat,
          
          y: lon 
        },
        srs: 'EPSG:4326',
        filterOptions: fo,
        apiKey: "calcul",
        onSuccess: function(result) {
       
          wapp.wait(false);

          resolve(result);
      

        },
        onFailure: function(error) {
         console.log(error);
         $("body").css("cursor", "default");
         alert("erreur");
         wapp.wait(false);
        reject(error);
        }
      });
    });
   


  }
