/* global cordova */
/**
  @brief: Cordova web application 
  @author: Jean-Marc Viglino (ign.fr)
  @copyright: IGN 2015-2019
  
  @require: JQuery
*/
import WebFont from 'webfontloader';
import _T from '../i18n'

/** Use jQuery as global */
import jQuery from 'jquery'
window.$ = jQuery;

/** Dynamically load cordova */
let scriptCordova = false;
const script = document.createElement('script');
script.onload = script.onerror = function() {
  scriptCordova = true;
  document.dispatchEvent(new Event('cordova'));
};
script.src = 'cordova.js';
document.head.append(script);

// Polyfill ol bug webkitCancelRequestAnimationFrame on android < 4.2
if (!window.cancelAnimationFrame && window.webkitCancelRequestAnimationFrame) {
  window.cancelAnimationFrame = window.webkitCancelRequestAnimationFrame;
}

/** 
 * @classdesc
 * Web application pour Cordova 
 *
 * @constructor
 * @param {Object} options 
 * 
 */
var CordovApp = function(obj) {
  var self = this;

  /**  Cordova app (or browser) */
  this.isCordova = window.cordova ? true:false;
  if (this.isCordova) $("body").attr("data-platform",cordova.platformId);
  else $("body").attr("data-platform","www");

  /** Webapp parameters: localStorage['WebApp@param'] */
  this.param = {};

  /** Show an alert
  *	@param {String} message to alert
  *	@param {String} title for the dialod
  */
  if (!this.alert) this.alert = function (what, titre) {
    // Use notification
    if (navigator.notification) navigator.notification.alert(what,null,titre?titre:_T("ALERTE"));
    else alert (what);
  }
  
  /** Show a message 
  *	@param {String} message to alert
  *	@param {String} title for the dialod
  *	@param {Array<String>} list of button labels
  *	@param {function} callback function with index of pressed button as argument
  */
  if (!this.message) this.message = function (message, titre, boutons, callback) {
    // Use notification
    if (navigator.notification) {
      navigator.notification.confirm (
        message?message:"", 
        callback, 
        titre?titre:_T("Message"), 
        boutons?boutons:["OK"]
      );
    } else {
      callback (confirm(message?message:titre)?2:1);
    }
  }
  
  /** Constructor: call when application is initilized
  * @api
  */
  this.initialize = function() {};

  /** Fires when the user presses the menu button
  * @api
  */
  this.onMenuButton = function() { this.toggleMenu(); };
  
  /** Pause: fires when app is paused (save parameters)
  * @api
  */
  this.pause = function() {};

  /** Resume: fires when app resume after pause (restaure parameters)
  * @api
  */
  this.resume = function() {};

  /** Resume: fires page back button is click
  * @param {String} id the page ID
  * @api
  */
  this.pageBack = function(/* id */) { this.hidePage(); };

  /** Application initialisation
  * @private
  */
  function _init() {
    // Minimize latences (si fastclick.js)...
    if (window.FastClick) {
      window.FastClick.attach(document.body);
      console.log ("FastClick");
    }
    // Get last params
    self.resetParam();
    
    // Device button behavior
    document.addEventListener("menubutton", function() {
      if (!self.closeDialog()) self.onMenuButton();
    }, false);
    document.addEventListener("backbutton", function() {
      if (!self.closeDialog()) self.onBackButton();
    }, false);
    
    // Pause / resume behavior
    document.addEventListener("pause", function(){ self.pause() }, false);
    document.addEventListener("resume", function(){ self.resume(); }, false);

    // 
    if (self.menu) {
      $(document).on("showpage", function(e) {
        self.onShowPage(e.page, e); 
      });
      $(document).on("hidepage", function(e) {
        self.onHidePage(e.page, e); 
      });
    }
    
    // Initialize app when fonts are loaded
    WebFont.load({
      custom: {
        families: ['FontAwesome', 'tools'],
        urls: ['./fonts/font-awesome.min.css','./fonts/font-tools.css'],
        testStrings: { 'FontAwesome': '\uf240' }
      },
      classes: false,
      // Initialize when fonts are loaded
      active: () => {
        self.initialize();
        console.log('FONT LOADED')
      },
      inactive: () => {
        console.warn('NO FONT LOADED')
      }
    });

    // Close splashscreen (if any)
    if (navigator.splashscreen) navigator.splashscreen.hide();
  }


  /* Load page templates asynchronously
  *	@param {function} callback function when pages are ready
  *	@private
  */
  function _loadPages() {
    var count = 0;

    // On pages ready
    function onPagesready() {
      count--;
      if (count>0) return false;

      // Page header
      $("[data-role='header'][data-back-button='true']").prepend (
        $("<i>").addClass("backArrowBt")
          .on('click touchstart', function(e) {
            var p= $(this).closest('[data-role="page"]').attr("id");
            self.pageBack(p);
            e.preventDefault();
            e.stopPropagation();
          })
      );

      // Onglets
      $("[data-role='onglet-bt'] div[data-list]").on( 'click touchstart', function(e) {
        if ($(this).data('list')=='close') CordovApp.prototype.hidePage();
        else CordovApp.prototype.showOnglet(this);
        e.preventDefault();
        e.stopPropagation();
      });
      $("div:first", "[data-role='onglet-bt']").each(function(){ 
        CordovApp.prototype.showOnglet(this); 
      });

      _init();

      return true;
    }

    // Load template recursively
    function loadTemplate (d) {
      if (!d) return;
      $('[data-template]', d).each(function() {
        if ($(this).data("template")) {
          count++;
          var self = $(this);
          CordovApp.template ($(this).data("template"), function(d) {
            loadTemplate (d);
            self.append(d);
            onPagesready();
          });
        }
      });
    }

    // Load page template
    $('[data-role="page"]').each(function() {
        if ($(this).data("template")) {
        count++;
        var self = $(this);
        CordovApp.template ("page-"+self.data("template"), function(d) {
          loadTemplate (d);
          self.append(d);
          onPagesready();
        });
        /*
        $('<link/>', {
          rel: 'stylesheet', 
          href: "templates/page-"+self.data("template")+".css"
        }).appendTo('head');				
        */
      }
    });
    // Load menu template
    $('[data-role="menu"]').each(function() {
      if ($(this).data("template")) {
        count++;
        var self = $(this);
        CordovApp.template ("menu-"+self.data("template"), function(d) {
          self.append (d);
          onPagesready();
        });
      }
    });

  }
  
  // Extend user class
  $.extend(this, obj);

  // Run when ready
  function load() {
    if (window.cordova) document.addEventListener("deviceready", _loadPages, false);
    else _loadPages();
  }
  if (scriptCordova) load();
  else document.addEventListener ('cordova', load);

  // Clear input 
  $("body").on("click touchstart","i.clear-input",function() {
    var i = $(this).prev();
    if (i.is('input')) i.val("").focus().change();
  });
  $("body").on("focusin","input",function() {
    var clear = $(this).next();
    if (clear.hasClass("clear-input")) clear.css("opacity",1);
  });
  $("body").on("focusout","input",function() {
    var clear = $(this).next();
    if (clear.hasClass("clear-input")) clear.css("opacity",0);
  });

  // Scroll input in a content if outside the screen 
  // (prevent input masking when keyboard pops up)
  $(window).resize(function() {
    var input = $("input:focus");
    if (!input.length) return;
    var delta = input.offset().top+input.outerHeight() - $(document).height();
    if (delta>0) {
      // Find parent to scroll in
      var parent = input.parents('[data-role="onglet-li"]').first();
      if (!parent.length) parent = input.parents('[data-role="content"]').first();
    
      parent.scrollTop(parent.scrollTop()+delta);
    }
  });

  // App is closing on the web
  $(window).on('beforeunload', function() {
    return self.quit();
  });

  // Open link target="_system" in a browser
  $("body").on("click", "a", function(e) {
    if (self.isCordova && $(this).attr("target") == "_system") {
      e.stopPropagation();
      e.preventDefault();
      navigator.app.loadUrl($(this).attr("href"), { openExternal:true });
    }
  });
    
};

var backButtonDate = 0;
/** Fires when the user presses the back button
* @api
*/
CordovApp.prototype.onBackButton = function() {
  if (new Date()-backButtonDate > 2000) {
    backButtonDate = new Date();
    this.notification(_T("Appuyer une seconde fois pour quitter..."), "2s");
  } else {
    this.quit();
  }
};

/** Quit the app (save before quit / prevent quit)
* @api
*/
CordovApp.prototype.quit = function() {
  if (navigator.app) navigator.app.exitApp();
};

/** Save app parameters (to localStorage)
*/
CordovApp.prototype.saveParam = function() {
  localStorage['WebApp@param'] = JSON.stringify(this.param);
};
  
/** Reset app parameters (load from localStorage)
*/
CordovApp.prototype.resetParam = function() {
  if (localStorage['WebApp@param']) this.param = JSON.parse(localStorage['WebApp@param']);
  else this.param = {};
};

var t = new Date();
/** Show a timer in the console between two calls
* @param {bool | string} msg Message to log / true to start timer
*/
CordovApp.prototype.timer = function(msg) {
  if (msg !== true) console.log ((new Date() - t) +" : "+ msg||"");
  t = new Date();
};

export default CordovApp;
