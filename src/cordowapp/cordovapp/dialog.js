/**
  @brief: Cordova web application 
  @author: Jean-Marc Viglino (ign.fr)
  @copyright: 2015
  
  @require: JQuery
*/
import CordovApp from './CordovApp'
import Dialog from '../Dialog'
import _T from '../i18n'

/** Application Dialog
* @member {Dialog}
*/
const dialog = CordovApp.prototype.dialog = new Dialog();

/** Internal dialog */
var _internalDialog = new Dialog();

/** Select dialog
* @param {Object|false|undefined} choice list of choice key/value or false to close the dialog or undefined to reopen previous one
* @param {String} selected key of selected item
* @param {function} callback function(key) return the selected key
* @param {Object} options (dialog options
*	 @param {boolean} options.search add a search input
*/
const selectDialog = CordovApp.prototype.selectDialog = function(choice, valdef, cback, options) {
  // Open existing dialog
  if (!choice) {
    if (choice===false) _internalDialog.close;
    else _internalDialog.show(null);
    return;
  }
  // New dialog
  if (!options) options = {};
  if (!options.listClass) options.listClass = {};
  if (typeof(cback) != "function") cback = function(c){ console.log(c); };
  var content = $("<div>");
  var ul = $("<ul>").attr("data-role","select").appendTo(content);
  var nb = 0;
  var selected = false;
  for (var i in choice) {
    nb++;
    $("<li>").html(choice[i])
      .data("item",i)
      .addClass(i==valdef ? "selected" : "")
      .addClass(options.listClass[i]||'')
      .on("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        $("li", this.parent).removeClass("selected");
        $(this).addClass("selected");
        if (!options.confirm) {
          _internalDialog.close();
          cback($(this).data('item'));
        }
        else selected = $(this).data('item');
      })
      .appendTo(ul);
  }
  // Filter option
  if (nb > (options.search ? 0:20)) {
    $('<i class="clear-input">').prependTo(content);
    $('<input type="text">')
      .addClass("search")
      .attr("placeholder","filtrer...")
      .on("keyup change", function() {
        var filter = new RegExp($(this).val(), "i");
        $("li", ul).each(function() {
          if (!filter) {
            $(this).show();
          } else {
            if (filter.test($(this).text())) $(this).show();
            else $(this).hide();
          }
        });

      })
      .prependTo(content);
    $('<i class="search-input">').prependTo(content);
  }
  if (options.confirm) {
    options.buttons = { ok: "ok", cancel:"annuler" };
    options.callback = function (bt) {
      if (selected && bt=="ok") cback(selected);
    }
  }
  _internalDialog.show(content, options);
};

/** Prompt dialog
* @param {String} Prompt
* @param {String} default value
* @param {function} callback function(val) returned value
* @param {Object} Dialog param
*/
const promptDlg = CordovApp.prototype.prompt = function(prompt, val, cback, options) {
  if (!options) options = {};
  if (typeof(cback)!="function") cback=function(c){console.log(c);};
  var content = $("<div>");
  var input = $("<input>")
    .attr({type: options.type || 'text', placeholder:options.placeholder})
    .appendTo(content);
  $("<i>").addClass("clear-input").appendTo(content);
  options.callback = function(b) {
    if (b=="submit") cback(input.val());
    else cback(val);
  }
  options.title = prompt;
  options.buttons = { cancel:"Annuler", submit:"OK" };
  _internalDialog.show(content, options);
  input.focus().val(val || "");
};

/** Show an alert
*	@param {String} message to alert
*	@param {String} title for the dialod
*/
const alertDlg = CordovApp.prototype.alert = function (what, titre, classe) {
  _internalDialog.show(what||"oops", {
    title: titre||_T("ALERTE"),
    buttons: ["OK"],
    classe: classe||"alert"
  });
};

/** Show a message 
*	@param {String} message to alert
*	@param {String} title for the dialod
*	@param {Array<String>} list of button labels
*	@param {function} callback function with index of pressed button as argument
*/
const messageDlg = CordovApp.prototype.message = function (message, titre, boutons, callback, classe) {
  _internalDialog.show(message||"...", {
    title: titre||_T("MESSAGE"),
    callback: callback,
    buttons: boutons||{ cancel:'ok' },
    classe: classe||"message"
  });
}

/** A dialog is open
*/
CordovApp.prototype.hasDialog = function() {
  return ( this.dialog.isOpen() || _internalDialog.isOpen() );
};

/** Close first open dialog
*/
CordovApp.prototype.closeDialog = function() {
  if (_internalDialog.isOpen()) {
    return _internalDialog.close();
  } else {
    return this.dialog.close();
  }
};


/** Notification
*/
var _notification=null;
var _timeout = null;

/** Show a notification on the bottom of the screen
* @param {String} notification
* @param {Number|String} duration (number in ms or a string "1s"/"1000ms") before the notification vanish (0 close the notificatoin), default 3s
* @param {boolean} noreplace true to avaoid replacing existing notification, default false
*/
const notification = CordovApp.prototype.notification = function(msg, duration, noreplace) {
  if (!_notification) {
    _notification = $("<div>").attr("data-role","notification").appendTo("body");
  }

  if (noreplace && _notification.hasClass('visible')) return;

  if (!msg && !duration) {
    if (_timeout) clearTimeout(_timeout);
    _notification.removeClass('visible'); 
    _notification.hide();
    return;
  }
  
  if (typeof(duration)=="string") {
    if (/ms$/.test(duration)) duration = parseFloat(duration);
    else if (/s$/.test(duration)) duration = parseFloat(duration)*1000;
  }
  if (typeof(duration)!="number") duration=0;
  duration = duration ? Math.max(duration,500) : 3000;

  _notification.html($("<div>").html(msg)).show();
  setTimeout (function(){ _notification.addClass('visible'); }, 200);
  if (_timeout) clearTimeout(_timeout);
  _timeout = setTimeout (function() {
    _notification.removeClass('visible'); 
    setTimeout (function(){ _notification.hide(); }, 200);
  }, duration);
};

/** Check if a notification is visible
* @return {boolean}
*/
CordovApp.prototype.isNotification = function() {
  return _notification.hasClass('visible');
};

/** Information notification
*/
var _notinfo=null;

/** Show notification information on top of the screen
* @param {String} title notification title
* @param {String} msg notification
* @param {} options
*	- className {string} CSS class name for the notification
*	- icon {html|undefined}
*	- onclose {function|undefined} callback function when notification is closed
*/
CordovApp.prototype.notinfo = function(title, msg, options) {
  options = options||{};
  if (!_notinfo) {
    _notinfo = $("<div>").attr("data-role","notinfo").appendTo("body");
  }

  var info = $("<div>").appendTo(_notinfo);
  if (options.className) info.addClass(options.className);
  $("<div>").addClass('closebox')
    .click(function() {
      info.removeClass('visible');
      setTimeout (function(){ info.remove(); }, 200);
      if (options.onclose) options.onclose();
    })
    .appendTo(info);
  options.icon = options.icon || "<i class='fa fa-comments-o'></i>";
  $("<div>").addClass('icon').html(options.icon).appendTo(info);
  $("<div>").addClass('title').html(title).appendTo(info);
  $("<div>").html(msg).appendTo(info);
  setTimeout (function(){ info.addClass('visible'); }, 200);
}

/** Wait dialog
*/
var _wait=null, _wback=null, _message=null, _pourcent=null;
var _wtimeout = null;

/** Wait dialog
* @param {String|false} message to show or false to hide the dialog
* @param {boolean} false to prevent animation (to chain dialogs)
*/
const waitDlg = CordovApp.prototype.wait = function(msg, options) {
  if (options===false) options = { anim:false };
  if (!options) options = {};
  if (!_wait) {
    _wback = $("<div>").attr("data-role","backDialog").appendTo("body");
    _wait = $("<div>").attr("id","wait").attr("data-role","dialog").appendTo("body");
    var spin = $("<i>").addClass("fa fa-spinner fa-pulse")
            .appendTo(_wait);
    _message = $("<div>").insertAfter(spin);
    var pc = $("<div class='pourcent'>").appendTo(_wait);
    _pourcent = $("<div>").appendTo(pc);
  }
  if (_wtimeout) clearTimeout(_wtimeout);
  if (msg !== false) {
    _wback.show();
    _wait.show();
    _message.html(msg);
    if (!_wait.hasClass('visible')) {
      _wait.removeClass();
      if (options.anim===false) _wait.addClass('visible noanim');
      else _wtimeout = setTimeout (function() { _wait.addClass('visible'); }, 200);
    }
    else _wait.removeClass().addClass('visible');
    if (options.pourcent!==undefined) {
      _pourcent.css("width",options.pourcent+"%").parent().show();
    } else {
      _pourcent.parent().hide();
    }
    if (options.className) _wait.addClass(options.className);
  } else  {
    _wback.hide();
    _wait.removeClass('visible');
    if (options.anim===false) _wait.hide();
    else _wtimeout = setTimeout (function(){ _wait.hide(); }, 200);
  }
}

CordovApp.prototype.isWaiting = function() {
  return _wback ? _wback.css("display")!="none" : false;
  //return _wait.hasClass('visible');
}

export {dialog}
export {selectDialog}
export {promptDlg};
export {alertDlg};
export {messageDlg};
export {waitDlg};
export {notification};

export default Dialog;
