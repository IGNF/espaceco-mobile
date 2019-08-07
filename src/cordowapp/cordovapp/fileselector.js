/********************
  @brief : Gestion de fichier avec Cordova
  @author : Jean-Marc Viglino (ign.fr)
  @copyright: IGN 2016
  
  Dialog de selection de fichiers avec Cordova
*/
import './fileselector.css'
import CordovApp from './cordovapp'

/** File selector
 * @param {String} path to start with
 * @param {function} success callback that is passed an URI to a local file or directory
 * @param {} options
 *  @param {bool|string} options.dir Choice a directory / title for the button
 */
CordovApp.prototype.fileDialog = function(path, success, options) {
  options = options || {};

  var self = this;
  var buttons = ["Annuler"];
  if (options.dir) buttons = {
    ok: (options.dir===true ? "choisir" : options.dir),
    cancel:"Annuler" 
  };
  // Oops
  function fail(e){
    self.alert("ERROR: can not access storage on the device...\n"+e.code);
    self.closeDialog();
  }

  // Test sdcard
  function getDirURL(entry){
    if (entry.nativeURL == "file:///storage/emulated/") return "file:///storage/emulated/0/";
    else return entry.nativeURL
  }
  function getDirName(entry) {
    console.log(entry.fullPath+" "+entry.name)
    switch (entry.fullPath) {
      case "/storage/emulated/":
      case "/":
        return "Mémoire interne";
      case "/storage/":
        return "Mes fichiers";
      default:
        if (entry.fullPath=="/storage/"+entry.name+"/") return "SD ("+entry.name+")";
        return entry.name;
    }
  }

  // Remove path if empty (on local)
  function testDir(entry, li) {
    console.log(entry);
    if (!entry.isDirectory) return;
    var path = getDirURL(entry)
    CordovApp.File.listDirectory (path,
      function(entry) {
        if (!entry.length) li.remove();
      });
  }

  // Fontawesome icons
  var iconTab =
  {	'jpeg':"fa-file-image-o",
    'jpg':"fa-file-image-o",
    'gif':"fa-file-image-o",
    'png':"fa-file-image-o",
    'mp3':"fa-file-audio-o",
    'wav':"fa-file-audio-o",
    'mp4':"fa-file-video-o",
    'mkv':"fa-file-video-o",
    'avi':"fa-file-video-o",
    'zip':"fa-file-archive-o",
    '7z':"fa-file-archive-o",
    'rar':"fa-file-archive-o",
    'txt':"fa-file-text-o",
    'md':"fa-file-text-o",
    'log':"fa-file-text-o",
    'html':"fa-file-code-o",
    'htm':"fa-file-code-o",
    'pdf':"fa-file-pdf-o",
    'apk':"fa-android",
    'default':"fa-file-o"
  };

  // Dialog selection
  function select(dirEntry)
  {	// Url
    var dir = getDirURL(dirEntry);
    // Prevent top root parent
    var parent = dir.replace(/[^/]*\/$/,"")
    parent = parent.replace(/emulated\/$/,"");
    // List directory
    CordovApp.File.listDirectory (dir,
      function(entry)
      {	var html = $("<div>");
        var ul = $("<ul>").appendTo(html);
        // Link to parent
        if (parent && parent!="file:///") 
        {	$("<li>").html('<i class="fa fa-reply-all" aria-hidden="true"></i> [...]')
            .addClass ("dir parent")
            .click(function()
            {	self.fileDialog(parent, success, options);
            })
            .appendTo(ul);
        }
        // Show files
        for (var i=0; i<entry.length; i++)
        {	if (options.dir && !entry[i].isDirectory) continue;
          if (!/^\./.test(entry[i].name))
          {	var icon = '<i class="fa fa-folder"></i>';
            if (!entry[i].isDirectory) 
            {	var ext = CordovApp.File.getExtension(entry[i].name);
              icon = '<i class="fa '+(iconTab[ext]||"fa-file-o")+'"></i>';
            }
            
            var li = $("<li>").html(icon+getDirName(entry[i]))
              .addClass (entry[i].isDirectory ? "dir":"file" )
              .addClass ("li_"+i )
              .data("path", entry[i].nativeURL)
              .click(function()
              {	var path = $(this).data("path");
                if ($(this).hasClass("dir")) self.fileDialog(path, success, options);
                else 
                {	self.closeDialog();
                  if (success) success(path);
                }
              })
              .appendTo(ul);
            // Remove root empty dir 
            if (!parent || parent==="file:///") testDir(entry[i], li);
          }
        }
        // Show dialog
        self.dialog.show (html, 
          {	title: getDirName(dirEntry), 
            className:"file-selector", 
            closeBox: true, 
            noClose: true, 
            buttons: buttons, 
            callback: function(e) { if (e=='ok' && success) success(dir); }
          });
      },
      fail
    );
  }

  // Decode path and run dialog
  if (!path || typeof(path)=="string"){
    CordovApp.File.getDirectory (
      path,
      function(dirEntry)
      {	select(dirEntry);
      }, 
      fail,
      false
    );
  }
  else select(path);
};

export default CordovApp
