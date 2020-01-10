/** Check and display info on url
 * @param {string} services a list services to check, default 'geoprotail,espaceco'
 * @param {string} url json file url to check
 */
CordovApp.prototype.checkInfo = function(services, url) {
  var self = this;
  services = services || 'geoportail,espaceco';

  // Test service url
  $.ajax({
    url: (url || 'https://geodesie.ign.fr/checkinfo.json?') + (new Date()).getTime(),
    success: function(res) {
      var tout = 0;
      
      // Show notinfo
      var showMessage = function(r, icon) {
        var today = new Date();
        var rex = new RegExp(r.service || 'none');
        if (!rex.test(services)) return;
        if (new Date(r.start) < today && today < new Date(r.end)) {
          tout += 500;
          setTimeout(function() { 
            var info = r.info || '';
            if (r.url) {
              info += (info ? '<br/>' :'') + '<a href="'+r.url.trim()+'" target="_system">en savoir plus...</a>';
            }
            self.notinfo(r.message, info, { icon: '<i class="fa '+icon+'"></i>'});
          }, tout);
        }
      }

      // Display all infos
      if (res.error) {
        res.error.forEach(function(m) {
          showMessage(m, 'fa-exclamation-triangle');
        });
      }
      if (res.warning) {
        res.warning.forEach(function(m) {
          showMessage(m, 'fa-info-circle');
        });
      }
      if (res.message) {
        res.message.forEach(function(m) {
          showMessage(m, 'fa-comments-o');
        });
      }
    }
  });
};