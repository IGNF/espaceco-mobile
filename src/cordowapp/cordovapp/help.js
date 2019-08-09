import './help.css'
import CordovApp from './CordovApp'

/** Gestion de l'aide
*/
var helpDiv = $("<div>").attr("id", "help").appendTo("body");
// Close help on click if no closebox
helpDiv.on('click', () => {
  if (!helpDiv[0].querySelector('.close')) {
    hideHelp();
  }
});
var step = 0;
var _timeout;
var _current = "";
var _param = JSON.parse(localStorage['WebApp@help']||"{}");

// Add associated css
$('<link/>', {
  rel: 'stylesheet', 
  href: './help/help.css'
}).appendTo('head');	

/** Save app parameters (to localStorage)
*/
function saveParam(t) {
  if (t) _param[t] = true;
  localStorage['WebApp@help'] = JSON.stringify(_param);
}

function nextHelp(s) {
  if (!helpDiv) return;
  if (s) step=s;
  else step++;
  if (_timeout) clearTimeout(_timeout);
  helpDiv.show();
  _timeout = setTimeout(function(){ helpDiv.removeClass().addClass('visible step step_'+step).addClass(_current); }, 200);
}

function hideHelp() {
  if (!helpDiv) return;
  helpDiv.removeClass();
  if (_timeout) clearTimeout(_timeout);
  _timeout = setTimeout(function(){ helpDiv.hide(); },500);
}

function showHelp(template) {
  // Deja fait !
  if (_param[template]) {
    hideHelp();
    return;
  }
  // Nouvel aide
  saveParam(template);
  var t = CordovApp.template("./help/"+template);
  if (!t || !t.length) {
    hideHelp();
    return;
  }

  _current = template;
  helpDiv.html("").removeClass().addClass("visible "+template).append(t).show();
  $(".close", t).on("click touchstart", function(e) {
    e.stopPropagation();
    e.preventDefault();
    hideHelp();
  });
  nextHelp(1);
}

/** @namespace CordovApp.help
*/
var help = CordovApp.prototype.help = {
  /** Show help
  * @function CordovApp.help.showHelp
  * @param {string} name template name (in ./help directory)
  */
  show: showHelp,
  /** Hide help
  * @function CordovApp.help.hideHelp
  */
  hide: hideHelp,
  /** Show next help page
  * @function CordovApp.help.nextHelp
  * @param {number} n next help 
  */
  next: nextHelp,
  /** Reset help
  * @function CordovApp.help.resetParam
  */
  reset: () => {
    _param={};
    saveParam();
  },
  /** Fullscreen help */
  fullscreen: (b) => {
    helpDiv.attr('data-fullscreen', b);
  }
};

// Handle events
$(document).on("showpage", function(e) {
  showHelp(e.page);
});
$(document).on("hidepage", function() {
  hideHelp();
});
$(document).on("menu", function(e) {
  if (e.show) showHelp("menu");
  else hideHelp();
});
$( document ).ready(function() {
  showHelp("main");
});

export {help}
export default CordovApp
