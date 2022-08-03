import wapp from '../wapp';
import { toLonLat } from 'ol/proj';



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
    
      // if (result.locations.length > 0) {
      //   let nodep =result.locations[0].placeAttributes.department;
      //   arrete = "https://naviforest.ign.fr/arretes/" + nodep + "_arrete_transport_bois.pdf ";
      //    console.log(arrete);
       
      //   }
   
      // //  window.open("https://naviforest.ign.fr", "_system");
     
      
    })
    .catch(function(error) {
      
     console.log('catch' + error);
      wapp.wait(false);
    });

}



function go(lat,lon,fo) {

    var params= 'searchgeom={"type":"Circle","coordinates":['+lat+','+lon +'],"radius":100}&' +
                'lon='+lon+'&lat='+lat +
                'index=poi&category=département&limit=1';
    return new Promise(function(resolve, reject) {
      wapp.wait("chargement ...");

      $.ajax({
        //L'URL de la requête 
        // url: "https://wxs.ign.fr/essentiels/geoportail/geocodage/rest/0.1/reverse?"+ 
        //        params,

        url: "https://api-adresse.data.gouv.fr/reverse/?lon="+ lon+"&lat="+lat,

        //La méthode d'envoi (type de requête)
        method: "GET",

        //Le format de réponse attendu
        dataType : "json",
    })
    //Ce code sera exécuté en cas de succès - La réponse du serveur est passée à done()
    /*On peut par exemple convertir cette réponse en chaine JSON et insérer
     * cette chaine dans un div id="res"*/
    .done(function(response){
        let data = JSON.stringify(response);
       if (response.features.length>0) {
        let dep = response.features[0].properties.postcode.substr(0,2);
        alert('https://naviforest.ign.fr/arretes/'+dep+ '_arrete_transport_bois.pdf');
       } else {
        alert('https://naviforest.ign.fr/arretes/');
       }
        console.log(data);
    })

    //Ce code sera exécuté en cas d'échec - L'erreur est passée à fail()
    //On peut afficher les informations relatives à la requête et à l'erreur
    .fail(function(error){
        alert("La requête s'est terminée en échec. Infos : " + JSON.stringify(error));
    })

    //Ce code sera exécuté que la requête soit un succès ou un échec
    .always(function(){
      //  alert("Requête effectuée");
        wapp.wait(false);

    });
   
    });
   


  }
