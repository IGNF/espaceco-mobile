/* global cordova, FileTransfer, resolveLocalFileSystemURL */
/**
  @brief : Gestion de fichier avec Cordova
  @author : Jean-Marc Viglino (ign.fr)
  @copyright: IGN 2012
*/
import CordovApp from './CordovApp'

/**
 * A set of usefull function to handle files with Cordova.   
 * It wil solve the `resolveLocalFileSystemURL` for you.
 * @namespace CordovApp.File
*/
CordovApp.File = {	
  /** Test if a path refer to a local path
   * @param {string} path
   * @return {boolean}
   */
  isLoacalFile: function(path /*, root*/) {
    return (
    // Android
      /^file:\/\/\//.test(path) ||
    // Windows
      /^ms-appdata:\/\/\//.test(path) ||
    // iOS
      /^\/var\/mobile\/Applications\//.test(path)
    );
  },

  /** Scan a directory
   * @param {string} path dir path
   * @param {function} success A callback that is passed an array of FileEntry and DirectoryEntry objects
   * @param {function} fail
  */
  listDirectory: function (path, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    this.getDirectory (
      path,
      function(dirEntry){
        var directoryReader = dirEntry.createReader();
        directoryReader.readEntries (success, fail);
      }, 
      fail,
      false
    );
  },
  
  /** Get a name with no special chars
   * @param {string} name the name
   * @return {string} a new name with no special chars
   */
  fileName: function(name) {
    // return name.replace(/\"/g,'').replace(/[ :\*\?<>\|]/g,'_');

    var illegalRe = /[/?<>\\:*|":]/g;
    //eslint-disable-next-line
    var controlRe = /[\x00-\x1f\x80-\x9f]/g;
    var reservedRe = /^\.+$/;
    var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    var windowsTrailingRe = /[. ]+$/;

    return (name || '_')
      .replace(illegalRe, '_')
      .replace(controlRe, '_')
      .replace(reservedRe, '_')
      .replace(windowsReservedRe, '_')
      .replace(windowsTrailingRe, '_');
  },
  
  /** Get the file extention
   * @param {string} path the file name
   * @param {string} string after the last '.' (file extension)
   */
  getExtension: function(path) {
    return path.split('.').pop();
  },
  
  /** Get the file name
   * @param {string} path the file fullname
   * @param {string} the file name
   */
  getFileName: function(path) {
    return path.split('/').pop();
  },
  
  /** Get the file dir
   * @param {string} path the file fullname
   * @param {string} the directory
   */
  getDir: function (path)
  {	return path.substring(0, path.lastIndexOf("/"));
  },

  /** Get free space disk 
   * @param {function} success callback that is passed the resulting space (Kbyte)
   * @param {function} fail callback invoked on error
   */
  getFreeDiskSpace: function(success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    if (!window.cordova) fail(-1);
    else cordova.exec(success, fail, "File", "getFreeDiskSpace", []);
  },

  /** Get the application directory for a path (Android only)
   * ie. Android/data/<app-id>/
   * @param {String} path URI referring to a local file or directory
   * @param {function} success callback that is passed a DirectoryEntry corresponding to appdir for the filesystem
   * @param {function} fail callback invoked on error
   */
  getApplicationDirectory: function(path, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    var id = this.getFileName(cordova.file.applicationStorageDirectory.replace(/\/$/,""));
    if (!this.isLoacalFile(path) && path!=="file:///") {
      var self = this;
      window.resolveLocalFileSystemURL (path+"Android/data/"+id+"/", success, 
        function() {
          path = self.getDir(path.replace(/\/$/,""));
          self.getApplicationDirectory (path, success, fail);
        });
    }
    else fail({ code:"-1" }); 
  },

  /** Test if a directory is rw (write/delete 'ok.ok' file)
  *	@param {String} path URI referring to a local directory 
  *	@param {function} success callback 
  *	@param {function} fail callback invoked on error
  */
  testWriteDir: function(path, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    var f = path+"ok.ok";
    var self = this;
    this.write(f, "You can safely remove this file.", function() {
      self.delFile(f);
      success();
    },
    fail);
  },

  /** Get a directory Entry
  *	@param {String} path URI referring to a local directory 
  *					can start with SD|SDFILE|SDCACHE|ASSET|CACHE|FILE|APP to refer to cordova.file roots
  *	@param {function} success callback that is passed a DirectoryEntry objects
  *	@param {function} fail callback invoked on error
  *	@param {bool} create if true create the directory (only one level), default false
  */
  getDirectory: function (path, success, fail, create) {
    if (!success) success = this.success || function(){};
    if (!fail) fail = this.fail;
    if (!window.LocalFileSystem) {
      fail({code:-1});
      return;
    }

    // File systhem URL
    if (this.isLoacalFile(path)) {
      // Create directory if doesn't exist
      if (create) {
        path = path.replace(/\/$/,"");
        var name = this.getFileName(path);
        path = this.getDir(path);
        window.resolveLocalFileSystemURL (
          path,
          function(dir) {
            dir.getDirectory(name, {create: true, exclusive: false}, success, fail);
          },
          fail
        );
      } else {
        window.resolveLocalFileSystemURL (path, success, fail);
      }
      return;
    }

    // Translate directory using 
    var croot = cordova.file.externalRootDirectory;
    var lup = [
        [/^TMP\/?/, cordova.file.externalDataDirectory||cordova.file.dataDirectory],
        [/^SDFILE\/?/, cordova.file.externalDataDirectory||cordova.file.dataDirectory],
        [/^SDCACHE\/?/, cordova.file.externalCacheDirectory||cordova.file.cacheDirectory],
        [/^SD\/?/, cordova.file.externalRootDirectory||cordova.file.documentsDirectory],
        [/^ASSET\/?/, cordova.file.applicationDirectory],
        [/^CACHE\/?/, cordova.file.cacheDirectory],
        [/^FILE\/?/, cordova.file.dataDirectory],
        [/^APP\/?/, cordova.file.applicationStorageDirectory]
      ]
    // Look for path
    for (var i=0; i<lup.length; i++) {
      if (lup[i][0].test(path)) {
        path = path.replace(lup[i][0],"");
        croot = lup[i][1];
        break;
      }
    }
    this.getDirectory (croot+path,success, fail, create);
    
    /* OLD VERION
    var lfs = LocalFileSystem.PERSISTENT;
    if (/^TMP\/?/.test(path))
    {	path = path.replace(/^TMP\/?/,"");
      lfs = LocalFileSystem.TEMPORARY;
    }
    // Recherche dans un repertoire
    window.requestFileSystem
    (	lfs, 0, 
      function(fileSystem)
      {	if (!path) success (fileSystem.root);
        else fileSystem.root.getDirectory(path, {create: (create!==false), exclusive: false}, success, fail);
      }
      , fail
    );
    */
  },
  
  /** Write a file
  *	@param {String} name URI referring to a local file  
  *	@param {string} data to write
  *	@param {function} success callback that is passed a FileEntry objects
  *	@param {function} fail callback invoked on error
  */
  write: function(name, data, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    // Recherche du repertoire
    var dir = name.substring(0, name.lastIndexOf("/"));
    name = name.substring(name.lastIndexOf("/")+1);
    this.getDirectory (
      dir,
      function(dirEntry){
        dirEntry.getFile(
          name, {create: true, exclusive: false}, 
          function (fileEntry) {
            fileEntry.createWriter (
              function gotFileWriter(writer) {
                writer.onwrite = function() { success(fileEntry); };
                writer.onerror = fail;
                writer.write(data);
              },
              fail
            );
          },
          fail
        );
      },
      fail,
      true
    );
  },
  
  /** Get file info (name, localURL, type, lastModifiedDate, size)
  *	@param {String} name URI referring to a local file  
  *	@param {function} success callback that is passed a FileEntry objects
  *	@param {function} fail callback invoked on error
  */
  info: function(name, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    // Recherche du repertoire
    var dir = name.substring(0, name.lastIndexOf("/"));
    name = name.substring(name.lastIndexOf("/")+1);
    this.getDirectory (
      dir,
      function(dirEntry){
        dirEntry.getFile (
          name, {create: false, exclusive: false}, 
          function (fileEntry) {
            // Get the file
            fileEntry.file (
              function (file) {
                success(file);
              },
              fail
            );
          },
          fail
        );
      },
      fail,
      false
    );
  },


  /** Read a file as text (utf-8)
  *	@param {String} name URI referring to a local file  
  *	@param {function} success callback that is passed the result of the read
  *	@param {function} fail callback invoked on error
  */
  read: function(name, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    // Recherche du repertoire
    var dir = name.substring(0, name.lastIndexOf("/"));
    name = name.substring(name.lastIndexOf("/")+1);
    this.getDirectory (
      dir,
      function(dirEntry) {
        dirEntry.getFile (
          name, {create: false, exclusive: false}, 
          function (fileEntry) {
            // Lecture
            fileEntry.file (
              function (file) {
                var reader = new FileReader();
                reader.onloadend = function(evt) {
                  var res = evt.target.result;
                  // remove utf-8 BOM 
                  if (res.charCodeAt(0) === 0xFEFF) {
                    res = res.substr(1);
                  }
                  success(res);
                };
                reader.readAsText(file);
              },
              fail
            );
          }
          , fail
        );
      },
      fail,
      false
    );
  },
  
  /** Move a file
  *	@param {String} file URI referring to a local file  
  *	@param {String} name URI referring to a local file to move to
  *	@param {function} success callback 
  *	@param {function} fail callback invoked on error
  */
  moveFile: function(file, name, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    var self = this;
    // Recuperer le fichier
    //resolveLocalFileSystemURI (file, 
    self.getFile(file, 
      function(fileEntry) {
        // Recherche du repertoire
        var dir = name.substring(0, name.lastIndexOf("/"));
        name = name.substring(name.lastIndexOf("/")+1);
        self.getDirectory (
          dir,
          function(dirEntry){
            fileEntry.moveTo(dirEntry, name,  success, fail);
          },
          fail
        );
      }, 
      fail,
      true
    ); 
  },
  
  /** Load a file from a remote adresse + save it to 'name'
   * @param {String} url URI referring to a remote file 
   * @param {String} name URI referring to a local file to move to
   * @param {function} success callback 
   * @param {function} fail callback invoked on error
   */
  dowloadFile: function (url, name, success, fail, options) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    var self = this;
    // Recherche du repertoire
    var dir = this.getDir(name);
    name = this.getFileName(name);
    this.getDirectory (
      dir,
      function(fileEntry) {
        var ft = new FileTransfer();
        var uri = encodeURI(url);
        ft.download (
          uri,
          fileEntry.toURL()+"__"+name,
          function(){
            self.moveFile(fileEntry.toURL()+"__"+name, fileEntry.toURL()+name, success, fail);
          },
          fail,
          false,
          options
          /* Optional parameters, currently only supports headers 
          {	headers: 
            {	"Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
            }
          }
          */
        );
      },
      fail,
      true
    );
  },
  
  /** Delete a file 
   * @param {String} name URI referring to a local file to move to
   * @param {function} success callback 
   * @param {function} fail callback invoked on error
   */
  delFile: function(name, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    // Recuperer le fichier
    this.getFile (name, 
      function(fileEntry){
        fileEntry.remove(success, fail);
      }, 
      fail
    ); 
  },

  /** Get file information
   * @param {String} name URI referring to a local file to move to
   * @param {function} success callback that is passed a FileEntry
   * @param {function} fail callback invoked on error
   */
  getFile: function(name, success, fail) {
    if (!success) success = this.success;
    if (!fail) fail = this.fail;
    if (this.isLoacalFile(name)) {
      resolveLocalFileSystemURL (name,success,fail);
    } else {
      // Recherche du repertoire
      var dir = name.substring(0, name.lastIndexOf("/"));
      name = name.substring(name.lastIndexOf("/")+1);
      this.getDirectory (
        dir,
        function(dirEntry) {
          dirEntry.getFile (
            name, {create: false, exclusive: false},
            success,
            fail
          )
        },
        fail,
        false
      );
    }
  },
  
  
  /** Default succes function
   * @private
   */
  success: function() {
    console.log("Operation on file successfull!");
  },
  
  /** Default fail function
   * @private
   */
  fail: function(/* error */) {
    // console.log ("FILE ERROR: " + error.code);
    }

};

(function(){
  /**
   * Convert a base64 string in a Blob according to the data and contentType.
   * 
   * @param {String} b64Data Pure base64 string without contentType
   * @param {String} contentType the content type of the file i.e (image/jpeg - image/png - text/plain)
   * @param {Int} sliceSize to process the byteCharacters
   * @see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
   * @return Blob
   */
  function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);
      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      var byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

  /**
   * Create a Image file according to its database64 string.
   * 
   * @param {String} name URI referring to a local file  
   * @param {String} name of the file that will be created
   * @param {String} content base64 string
   * @param {function} success callback that is passed a FileEntry objects
   * @param {function} fail callback invoked on error
   * @see http://ourcodeworld.com/articles/read/150/how-to-create-an-image-file-from-a-base64-string-on-the-device-with-cordova
   */
  CordovApp.File.writeBase64 = function (name, content, success, fail) {
    // Get content type / data
    var t = /^data:([^;]*);base64,(.*)/.exec(content);
    var contentType = t[1]
    var data = t[2];
    // Convert the base64 string in a Blob
    var blob = b64toBlob(data, contentType);
    // Write
    this.write (name, blob, success, fail);
  };

})();

export default CordovApp
