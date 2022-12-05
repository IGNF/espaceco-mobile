import wapp from './wapp'
import CordovApp from 'cordovapp/CordovApp'

/**
 * Affichage de la maitenance
 * @param {boolean} nodelay 
 */
wapp.maintenance = function(nodelay) {
  // Calcul avec un delais pour l'affichage
  if (!nodelay) {
    $("#maintenance").addClass('calculating');
    $("#maintenance .pie p").text('calcul');
    setTimeout(function(){
      wapp.maintenance(true);
    }, 500)
    return;
  }
  // Info
  var freeDiskSpace = 0;
  var cacheImage = {};
  var cacheVecteur = {};

  // Affichage des infos (en asynchrone)
  var count = 0;
  function countCache(cache, className) {
    var ul = $("#maintenance .resume");
    var s = 0;
    for (var i in cache) {
      var c = cache[i];
      s += c.size;
      $("<li>").append($('<p>').addClass('title').text(i))
        .append($('<p>').text(c.nb+' fichiers - '+(c.size/1024/1024).toFixed(2)+' Mo'))
        .appendTo(ul);
    }
    $("#maintenance .info span."+className).text((s/1024/1024).toFixed(2));
    return s;
  }

  function show(async) {
    if (async) {
      count--;
      if (!count) {
        console.log(freeDiskSpace, cacheImage, cacheVecteur);
        $("#maintenance .info span.diskspace").text((freeDiskSpace/1024/1024).toFixed(1));
        $("#maintenance .resume").html('');
        var total = countCache(cacheImage, 'cimage') 
                  + countCache(cacheVecteur, 'cvector');
        total /= 1024;
        if (total) {
          var n = total / (total + freeDiskSpace) * 360;
          console.log(n, total, freeDiskSpace)
          if (total/1024/1024 > .5) $("#maintenance .pie p").text((total/1024/1024).toFixed(1)+' Go');
          else $("#maintenance .pie p").text((total/1024).toFixed(1)+' Mo');
          if (n<180) {
            $("#maintenance .pie .sector50").hide();
            $("#maintenance .pie .sector").css({ transform: "rotate(-180deg)" });
            $("#maintenance .pie .sector > div").css({ transform: "rotate("+(180+n)+"deg)" });
          } else {
            $("#maintenance .pie .sector50").show();
            $("#maintenance .pie .sector").css({ transform: "rotate("+(n-360)+"deg)" });
            $("#maintenance .pie .sector > div").css({ transform: "rotate(0deg)" });
          }
        } 
        $("#maintenance").removeClass('calculating');
      }
    } else {
      count++;
      setTimeout(function(){ show(true); }, 200);
    }
    return;
  }
  
  // Espace libre
  CordovApp.File.getFreeDiskSpace(function (s){
    freeDiskSpace = s;
    show();
  });

  /* Calcul du cache */
  // Add to cache
  function addCache(ldir, cache, name) {
    if (!cache[name]) cache[name] = { nb:0, size:0 };
    for (var i=0, f; f=ldir[i]; i++) {
      if (f.isFile) {
        CordovApp.File.info("FILE/"+f.fullPath, function(f){
          cache[name].nb++;
          cache[name].size += f.size;
          show();
        });
      } else {
        getCache(f, cache, name);
      }
    }
  }

  // Calcul du cache
  function getCache(d, cache, name) {
    name = name || d.name;
    if (/^G\d*$/.test(name)) {
      var n = parseInt(name.replace(/^G/,''));
      var community = wapp.userManager.getGroupById(n);
      if (community) name = community.name;
    }
    CordovApp.File.listDirectory('FILE/'+d.fullPath, (ldir) => addCache(ldir, cache, name));
  }

  // Cache signalements
  CordovApp.File.listDirectory('FILE/cache-signalements', (ldir) => addCache(ldir, cacheVecteur, 'Signalements'));
  
  // Cache geoportail
  CordovApp.File.listDirectory('FILE/geoportail',
    function(l) {
      for (var i=0, d; d=l[i]; i++) {
        getCache(d, cacheImage);
      }
    }
  );

  // Cache vecteur
  CordovApp.File.listDirectory('FILE/cache',
    function(l) {
      for (var i=0, d; d=l[i]; i++) {
        getCache(d, cacheVecteur);
      }
    }
  );
};
