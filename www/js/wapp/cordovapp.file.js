/********************
	@brief : Gestion de fichier avec PhoneGap
	@author : Jean-Marc Viglino (ign.fr)
	@copyright: IGN 2012
	
	Gestion de fichier avec PhoneGap
*/
/** @namespace CordovApp.File
*/
CordovApp.File = 
{	
	/** Scan a directory
		success : A callback that is passed an array of FileEntry and DirectoryEntry objects
	*/
	listDirectory: function (path, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		this.getDirectory 
		(	path,
			function(dirEntry)
			{	var directoryReader = dirEntry.createReader();
				directoryReader.readEntries (success, fail);
			}, 
			fail,
			false
		);
	},
	
	/** Name with no special cars
	*/
	fileName: function(name)
	{	return name.replace(/\"/g,'').replace(/[ :\*\?<>\|]/g,'_');
	},
	
	/** Get the file extention
	*/
	getExtension: function(path) 
	{	return path.split('.').pop();
	},
	
	/** Get the file extention
	*/
	getFileName: function(path) 
	{	return path.split('/').pop();
	},
	
	/** Get the file dir
	*/
	getDir: function (path)
	{	return path.substring(0, path.lastIndexOf("/"));
	},

	/** Get the application directory for a path 
	* > Android/data/<app-id>/
	*	@param {DOMString} path URI referring to a local file or directory
	*	@param {function} success callback that is passed a DirectoryEntry corresponding to appdir for the filesystem
	*	@param {function} fail callback invoked on error
	*/
	getApplicationDirectory: function(path, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		var id = this.getFileName(cordova.file.applicationStorageDirectory.replace(/\/$/,""));
		if (!/^file\:\/\/\//.test(path) || path=="file:///") fail({ code:"-1" });
		else
		{	var self = this;
			window.resolveLocalFileSystemURL (path+"Android/data/"+id+"/", success, 
				function()
				{	path = self.getDir(path.replace(/\/$/,""));
					self.getApplicationDirectory (path, success, fail);
				});
		}
	},

	/** Test if a directory is rw (write/delete 'ok.ok' file)
	*	@param {DOMString} path URI referring to a local directory 
	*	@param {function} success callback 
	*	@param {function} fail callback invoked on error
	*/
	testWriteDir: function(path, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		var f = path+"ok.ok";
		var self = this;
		this.write(f, "You can safely remove this file.", function()
		{	self.delFile(f);
			success();
		},
		fail);
	},

	/** Get a directory Entry
	*	@param {DOMString} path URI referring to a local directory 
	*					can start with SD|SDFILE|SDCACHE|ASSET|CACHE|FILE|APP to refer to cordova.file roots
	*	@param {function} success callback that is passed a DirectoryEntry objects
	*	@param {function} fail callback invoked on error
	*	@param {bool} create if true create the directory (only one level), default false
	*/
	getDirectory: function (path, success, fail, create)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		if (!window.LocalFileSystem)
		{	fail({code:-1});
			return;
		}

		// File systhem URL
		if (/^file\:/.test(path))
		{	// Create directory if doesn't exist
			if (create)
			{	path = path.replace(/\/$/,"");
				var name = this.getFileName(path);
				path = this.getDir(path);
				window.resolveLocalFileSystemURL
				(	path,
					function(dir)
					{	dir.getDirectory(name, {create: true, exclusive: false}, success, fail);
					}
					, fail
				);
			}
			else
			{	window.resolveLocalFileSystemURL (path, success, fail);
			}
			return;
		}

		// Translate directory using 
		var croot = cordova.file.externalRootDirectory;
		var lup = [
				[/^TMP\/?/, cordova.file.externalDataDirectory||cordova.file.dataDirectory],
				[/^SDFILE\/?/, cordova.file.externalDataDirectory],
				[/^SDCACHE\/?/, cordova.file.externalCacheDirectory],
				[/^SD\/?/, cordova.file.externalRootDirectory],
				[/^ASSET\/?/, cordova.file.applicationDirectory],
				[/^CACHE\/?/, cordova.file.cacheDirectory],
				[/^FILE\/?/, cordova.file.dataDirectory],
				[/^APP\/?/, cordova.file.applicationStorageDirectory]
			]
		// Look for path
		for (var i=0; i<lup.length; i++)
		{	if (lup[i][0].test(path))
			{	path = path.replace(lup[i][0],"");
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
	*	@param {DOMString} name URI referring to a local file  
	*	@param {string} data to write
	*	@param {function} success callback that is passed a FileEntry objects
	*	@param {function} fail callback invoked on error
	*/
	write: function(name, data, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		// Recherche du repertoire
		var dir = name.substring(0, name.lastIndexOf("/"));
		name = name.substring(name.lastIndexOf("/")+1);
		this.getDirectory 
		(	dir,
			function(dirEntry)
			{	dirEntry.getFile
				(	name, {create: true, exclusive: false}, 
					function (fileEntry) 
					{	fileEntry.createWriter
						(	function gotFileWriter(writer) 
							{	writer.onwrite = function(evt) { success(fileEntry); };
								writer.onerror = fail;
								writer.write(data);
							}
							, fail
						);
					}
					, fail
				);
			},
			fail,
			true
		);
	},
	
	/** Get file info (name, localURL, type, lastModifiedDate, size)
	*	@param {DOMString} name URI referring to a local file  
	*	@param {function} success callback that is passed a FileEntry objects
	*	@param {function} fail callback invoked on error
	*/
	info: function(name, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		// Recherche du repertoire
		var dir = name.substring(0, name.lastIndexOf("/"));
		name = name.substring(name.lastIndexOf("/")+1);
		this.getDirectory 
		(	dir,
			function(dirEntry)
			{	dirEntry.getFile
				(	name, {create: false, exclusive: false}, 
					function (fileEntry) 
					{	// Get the file
						fileEntry.file
						(	function (file) 
							{	success(file);
							}
							, fail
						);
					}
					, fail
				);
			},
			fail,
			false
		);
	},


	/** Read a file as text
	*	@param {DOMString} name URI referring to a local file  
	*	@param {function} success callback that is passed the result of the read
	*	@param {function} fail callback invoked on error
	*/
	read: function(name, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		// Recherche du repertoire
		var dir = name.substring(0, name.lastIndexOf("/"));
		name = name.substring(name.lastIndexOf("/")+1);
		this.getDirectory 
		(	dir,
			function(dirEntry)
			{	dirEntry.getFile
				(	name, {create: false, exclusive: false}, 
					function (fileEntry) 
					{	// Lecture
						fileEntry.file
						(	function (file) 
							{	var reader = new FileReader();
								reader.onloadend = function(evt) 
								{	success(evt.target.result);
								};
								reader.readAsText(file);
							}
							, fail
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
	*	@param {DOMString} file URI referring to a local file  
	*	@param {DOMString} name URI referring to a local file to move to
	*	@param {function} success callback 
	*	@param {function} fail callback invoked on error
	*/
	moveFile: function(file, name, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		var self = this;
		// Recuperer le fichier
		//resolveLocalFileSystemURI (file, 
		self.getFile(file, 
			function(fileEntry)
			{	// Recherche du repertoire
				var dir = name.substring(0, name.lastIndexOf("/"));
				name = name.substring(name.lastIndexOf("/")+1);
				self.getDirectory 
				(	dir,
					function(dirEntry)
					{	fileEntry.moveTo(dirEntry, name,  success, fail);
					},
					fail
				);
			}, 
			fail,
			true
		); 
	},
	
	/** Load a file from a remote adresse + save it to 'name'
	*	@param {DOMString} url URI referring to a remote file 
	*	@param {DOMString} name URI referring to a local file to move to
	*	@param {function} success callback 
	*	@param {function} fail callback invoked on error
	*/
	dowloadFile: function (url, name, success, fail, options)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		// Recherche du repertoire
		/*
		var dir = name.substring(0, name.lastIndexOf("/"));
		name = name.substring(name.lastIndexOf("/")+1);
		*/
		var dir = this.getDir(name);
		name = this.getFileName(name);
		this.getDirectory 
		(	dir,
			function(fileEntry)
			{	var ft = new FileTransfer();
				var uri = encodeURI(url);
				ft.download
				(	uri,
					fileEntry.toURL()+name,
					success,
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
	*	@param {DOMString} name URI referring to a local file to move to
	*	@param {function} success callback 
	*	@param {function} fail callback invoked on error
	*/
	delFile: function(name, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		// Recuperer le fichier
		this.getFile (name, 
			function(fileEntry)
			{	fileEntry.remove(success, fail);
			}, 
			fail
		); 
	},
	
	/** Get file information
	*	@param {DOMString} name URI referring to a local file to move to
	*	@param {function} success callback that is passed a FileEntry
	*	@param {function} fail callback invoked on error
	*/
	getFile: function(name, success, fail)
	{	if (!success) success = this.success;
		if (!fail) fail = this.fail;
		if (name.match ( /^file:\/\/\//) )
		{	resolveLocalFileSystemURL (name,success,fail);
		}
		else
		{	// Recherche du repertoire
			var dir = name.substring(0, name.lastIndexOf("/"));
			name = name.substring(name.lastIndexOf("/")+1);
			this.getDirectory 
			(	dir,
				function(dirEntry)
				{	dirEntry.getFile
					(	name, {create: false, exclusive: false},
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
	*/
	success: function()
	{	console.log("Operation on file successfull!");
	},
	
	/** Default fail function
	*/
	fail: function(error) 
	{   console.log ("FILE ERROR: " + error.code);
    }

};