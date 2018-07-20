/**
 * Classe pour la gestion du cache vecteur
 * @param {*} options 
 *	@param {string} options.page page du cuichet avec les boutons de chargement, "#guichet"
 */
var CacheVector = function(options) {
  var self = this;
  if (!options) options = {};

  var page = this.page = $(options.page || '#guichet');

  $('.addmap', this.page).click(function(){
    self.addDialog();
  });

};

/** Set Guichet courant
 */
CacheVector.prototype.setCurrentGuichet = function(guichet) {
  this.currentGuichet = guichet;
};

/** Get Guichet courant
 */
CacheVector.prototype.getCurrentGuichet = function() {
  return this.currentGuichet;
};

/** Afficher les cartes en cache
 */
CacheVector.prototype.showList = function() {
  console.log(this.getCurrentGuichet());
};

/**
 * Ajouter une carte en cache
 * @param {sting} name nom de la carte
 * @param {Array<*>} layers liste de layer a ajouter
 */
CacheVector.prototype.addCache = function(name, layers) {
  if (!layers.length) return;
  console.log(name, layers);
};

/** Dialogue d'ajout de carte
 */
CacheVector.prototype.addDialog = function() {
  var self = this;
  var guichet = this.getCurrentGuichet();
  var content = CordovApp.template('dialog-guichet');
  var ul = $('ul.layerselect', content);
  for (var i=0, l; l = guichet.layers[i]; i++) {
    if (l.type === 'WFS') {
      $("<li>").addClass('selected')
        .attr('data-input','')
        .text(l.nom)
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

  wapp.dialog.show (content, {
    title: "Ajouter une carte", 
    buttons: { ajouter:"Ajouter...", cancel:"Annuler" },
    className: "attributes guichet",
    callback: function(b) {
      if (b=='ajouter') {
        var name = $('input',content).val() || 'Sans titre';
        var layers = [];
        $("li", ul).each(function() {
          if ($(this).hasClass('selected')) layers.push($(this).data('layer'));
        });
        self.addCache(name, layers)
      }
    }
  });
};
