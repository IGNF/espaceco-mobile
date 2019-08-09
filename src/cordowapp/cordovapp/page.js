/* global wapp */
import CordovApp from './CordovApp'

/**
 * jQuery object of the menu: $("[data-role='menu']")
 */
CordovApp.prototype.menu = $("[data-role='menu']");

// Internal template cache array
var templates = {};

/** Load template in a file
*	@param {string} tmp the template file to load
*	@param {function|undefined} async a callback function (asynchron loading) if none the load is done synchronously
*	@return a jQuery object if not async
*	@api
*/
CordovApp.template = function (tmp, async) {
  if (typeof(tmp) != "string") return "";

  function getData () {
    var data = $( $(templates[tmp]) || "" );
    if (window.i18n) $("[data-i18n]", data).each(function() {
      var $this = $(this);
      $this.html(window.i18n.T($this.attr("data-i18n")));
    });
    return data;
  }

  // Mise en cache
  if (!templates[tmp]) {
    var url = tmp+".html";
    if (tmp.indexOf("/")<0) url = "templates/"+tmp+".html";
    $.ajax({
      type: "GET",
      dataType: 'text',
      url: url+"?_t="+(new Date).getTime(),
      async: async ? true : false,
      // OK
      success: function(resp) {	
        // ERROR: get the doc itself
        if (/^<!DOCTYPE/.test(resp)) {
          console.log ("ERROR Loading template "+tmp);
          templates[tmp] = "ERROR";
        } else {
          // Return template
          templates[tmp] = resp; 
        }
        if (async) async (getData());
      },
      // Ooops
      error: function() {
        console.log ("ERROR Loading template "+tmp);
        templates[tmp] = "ERROR";
        if (async) async (getData());
      }
    });
    // Add associated css
    $('<link/>', {
      rel: 'stylesheet', 
      href: url.replace(/html$/,'css')
    }).appendTo('head');	
  } else {
    if (async) async (getData());
  }
  if (!async) return getData();
}

/** Call on menu show or hide
* @param {event} event type:"menu", show {bool} show or hide the menu
* @api
*/
CordovApp.prototype.onMenu = function(/* event */) {}

/** Call on menu show or hide
* @param {event} event type: "showPage"
* @api
*/
CordovApp.prototype.onShowPage = function(/* event */) {}

/** Call on menu show or hide
* @param {event} event type: "hidePage"
* @api
*/
CordovApp.prototype.onHidePage = function(/* event */) {}

/** Show the menu
* @api
*/
CordovApp.prototype.showMenu = function() {
  if (!this.menu.hasClass("visible")) {
    this.onMenu();
    this.menu.addClass("visible");
    $(document).trigger( { type:"menu", show:true } );
  }
};

/** Hide the menu
*/
CordovApp.prototype.hideMenu = function() {
  if (this.menu.hasClass("visible")) {
    this.menu.removeClass("visible");
    $(document).trigger( { type:"menu", show:false } );
  }
};

/** Toggle menu visibility
*/
CordovApp.prototype.toggleMenu = function() {
  if (this.menu.hasClass("visible")) this.hideMenu();
  else this.showMenu();
};

/** Is menu shown
*/
CordovApp.prototype.isMenu = function() {
  return this.menu.hasClass("visible");
};

/** Show a page
* @param {String|Array} id_page id or array of ids of the page(s) to show
* @param {String} onglet the list item to show
*/
CordovApp.prototype.showPage = function(id_page, onglet) {
  if (!id_page) return;
  if (typeof(id_page) == "string") id_page=[id_page];
  if (!id_page.length) return;
  
  // New page is shown
  $("body").attr("data-page",id_page[0]);

  // Hide page shown
  $("[data-role='page'].visible").each(function() {
    if ($.inArray(this.id,id_page)<0) {
      var self = $(this)
        .trigger( { type: "hidepage", page:$(this).attr('id') } )
        .removeClass("visible");
      setTimeout (function(){ self.hide(); }, 500);
    }
  });
  // hide menu
  this.hideMenu();
  // Show page
  function show(item) {
    setTimeout (function() { item.addClass("visible"); }, 100);
  }
  for (var i=0; i<id_page.length; i++) {
    var self = $("#"+id_page[i]);
    if (self.attr("data-onshow")) {
      try {
        eval(self.attr("data-onshow"));
      } catch(e) { /* ok */ }
    }
    self.trigger( { type:"showpage", page:id_page[i] } )
      .show();
    show (self);
    if (onglet) wapp.showOnglet($('[data-role="onglet-bt"] [data-list="'+onglet+'"]', self))
  }
};

/** Get action buttons in the header of the tab
 * @param {String} id_page id of the page
 */
const getActionBt = CordovApp.prototype.getActionBt = function(id_page) {
  return  $('[data-role="action-bt"]', '#'+id_page);
};

export {getActionBt};

/** Show action buttons in the header of the tab
 * @param {String} id_page id of the page
 */
const showActionBt = CordovApp.prototype.showActionBt = function(id_page, b) {
  if (b!==false) getActionBt(id_page).show();
  else getActionBt(id_page).hide();
};

export {showActionBt};

/** Hide action buttons in the header of the tab
 * @param {String} id_page id of the page
 */
CordovApp.prototype.hideActionBt = function(id_page) {
  getActionBt(id_page).hide();
};

/** Hide the page
* @param {String|null} id of the page to hide, if null hide all pages
*/
CordovApp.prototype.hidePage = function(id_page) {
  if (id_page && !this.isPage(id_page)) return;
  $("body").attr("data-page","");
  // hide all pages
  if (!id_page) {
    $("[data-role='page'].visible").each(function() {
      var self = $(this)
        .trigger( { type:"hidepage", page:$(this).attr('id') } )
        .removeClass("visible");
      $(":focus", this).blur();
      setTimeout (function(){ self.hide(); }, 500);
    });
  } else {
    // Hide the page
    var self = $("#"+id_page)
      .trigger( { type:"hidepage", page:id_page } )
      .removeClass("visible");
    $(":focus", self).blur();
    setTimeout (function(){ self.hide(); }, 500);
  }
};

/** Toggle page visibility
* @param {String} id of the page to show/hide
*/
CordovApp.prototype.togglePage = function(id_page) {
  var item = $("#"+id_page);
  if (item.hasClass("visible")) this.hidePage(id_page);
  else this.showPage(id_page);
};

/** Test if the page is on
* @param {String} id of the page 
*/
CordovApp.prototype.isPage = function(id_page) {
  return $("#"+id_page).hasClass("visible");
}

/** Get the page object
* @return {jQuery} list of pages on
*/
CordovApp.prototype.getPage = function() {
  return $("[data-role='page'].visible").attr('id');
}

/** Show an onglet
* @param {String|jQuery} the list item to show
*/
CordovApp.prototype.showOnglet = function(item) {
  if (typeof(item)=="string") item = $('[data-role="onglet-bt"] [data-list="'+item+'"]');
  if ($(item).hasClass('select') || $(item).hasClass('disabled')) return;
  var parent = $(item).parent().parent();
  $("[data-role='onglet-li']", parent).hide();
  $("div", $(item).parent()).removeClass('select');
  var onglet = $(item).data("list");
  $(item).addClass('select');
  $("[data-role='onglet-li'][data-list="+onglet+"]", parent)
    .trigger({ type:'showonglet' })
    .show();
};

/** Enable an onglet
* @param {String|jQuery} the list item 
*/
CordovApp.prototype.enableOnglet = function(item,b) {
  if (typeof(item)=="string") item = $('[data-role="onglet-bt"] [data-list="'+item+'"]');
  if (b) $(item).removeClass('disabled');
  else $(item).addClass('disabled');
};

/** Test if an onglet is shown
* @param {String|jQuery} the list item 
*/
CordovApp.prototype.isOnglet = function(item) {
  if (typeof(item)=="string") item = $('[data-role="onglet-bt"] [data-list="'+item+'"]');
  return ($(item).hasClass('select'));
};

/** Show an image fullscreen 
* @param {image} Image to display fullscreen
*/
CordovApp.prototype.fullscreen = function(img) {
  var fs = $("#fullscreen");
  if (!fs.length) {
    fs = $("<div>").attr("id", "fullscreen")
      .css({position:"fixed", top:0, left:0, right:0, bottom:0, opacity:1 })
      .on("click touchstart", function(e) {
        e.preventDefault();
        e.stopPropagation();
        wapp.hideFullscreen();
      })
      .appendTo("body");
  }
  fs.show().html("").css("opacity",0);
  
  img = $(img);
  var offset = img.offset();
  var dw = $(document).width();
  var dh = $(document).height();

  var nw = img.get(0).naturalWidth; 
  var nh =  img.get(0).naturalHeight; 
  var e = Math.min (img.width()/nw , img.height()/nh);
  var ne = Math.min ((dw-20)/nw , (dh-20)/nh);

  var tr = 'scale('+e+') translate('+((offset.left-dw/2)/e)+'px, '+((offset.top-dh/2)/e)+'px)';
  var bimg = $("<img>").attr("src",img.attr("src"))
      .css({
        "position": "absolute", 
        "top": "50%",
        "left": "50%",
        "transform": tr,
        "-webkit-transform": tr,
        "transform-origin": '0 0',
        "-webkit-transform-origin":'0 0 '
      });
  fs.append(bimg);
  tr = 'scale('+ne+') translate(-50%, -50%)';
  setTimeout(function() {
    fs.css("opacity",1);
    bimg.css({
      "max-width": (100/ne)+"%",
      "max-height": (100/ne)+"%",
      "transform": tr, 
      "-webkit-transform": tr, 
    });
  },100);
}

/** is in fullscreen mode
*/
CordovApp.prototype.isFullscreen = function() {
  return $("#fullscreen").css("display") == "block";
}

/** Remove fullscreen mode
*/
CordovApp.prototype.hideFullscreen = function() {
  var fs = $("#fullscreen");
  if (fs.css("display")=="block") {
    fs.css("opacity",0);
    setTimeout(function(){fs.hide();},300);
  }
}

export default CordovApp
