'use strict';

function MainCtrl($scope, $timeout, Evernote, $sce, $q, $indexedDB) {
	
	$scope.to_trusted = function(html_code){
 	   return $sce.trustAsHtml(html_code);
    }

	$scope.notes = [];

	//Get the Bookmarks from IndexedDB
	var myObjectStore = $indexedDB.objectStore('bookmarks');
	myObjectStore.getAll().then(function(results) {  
      // Update scope
      $scope.notes = results;
    });
	
	Evernote.getToken( true, 
		function(error, authTokenEvernote, noteStoreURL) {
	        //console.log('token fetch', error, authTokenEvernote);
	        
	        var noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL);
	        var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
	        var noteStore = new NoteStoreClient(noteStoreProtocol);
	      	        
	        var nbGUID = "c307a40f-6175-4529-8898-6de4695671ee"; //This will be later setup through settings screen
	        
	        var filter = new NoteFilter();
	        filter.notebookGuid = nbGUID;

	        var spec = new NotesMetadataResultSpec();
			spec.includeTitle = true;

	       
	        var noteGuids = [];
	        var deferred = $q.defer();

	        //noteStore.findNoteCounts(authTokenEvernote, filter, false, function (result){ console.log(result); } );

	        noteStore.findNotesMetadata(authTokenEvernote, filter, 0,100, spec, function (noteList){   
	        	if(noteList.notes){
		        	for(var i = 0; i < noteList.notes.length; i++){
		        		//$scope.notes.push(noteList.notes[i].title);
		        		noteGuids.push({guid: noteList.notes[i].guid, title: noteList.notes[i].title});
		        	}
	        	}
	        	deferred.resolve(noteGuids);
	        	
	        });

	        deferred.promise.then(function(noteGuids) {
			  	getNote(authTokenEvernote, noteStore, noteGuids);
			}, function(reason) {
			  
			}, function(update) {
			  
			});
	        
      }
    );

	var getNote = function(authTokenEvernote, noteStore, noteGuids){
		if(noteGuids.length == 0){
			return;
		}
		else{
			var guid = noteGuids.shift();
			guid = guid.guid;
			var deferred = $q.defer();
			console.log('GUID: '+guid);

			noteStore.getNote(authTokenEvernote, guid, true,true,false,false,function(noteRes){
				var parser = new DOMParser();
				var serializer = new XMLSerializer();
				var doc = parser.parseFromString(noteRes.content, "application/xml");
				var anc = doc.getElementsByTagName("a");
				if(anc.length > 0){
					anc = anc.item(0);
					anc.parentNode.removeChild(anc);
				}

				var en = doc.getElementsByTagName("en-note");
				en = en.item(0);

				//console.log(en);
				var title = noteRes.title;
				var url = noteRes.attributes.sourceURL;
				var img_src = "";
				var cont = en.textContent; //serializer.serializeToString(en);	

				
				var bookmarkObj = {guid: guid, title: title, url: url, content: cont};
				var img_resource = null;

				if(noteRes.resources && noteRes.resources[1]){
					img_resource = noteRes.resources[1];
				}
				else if(noteRes.resources && noteRes.resources[0]){
					img_resource = noteRes.resources[0];
				}

				if(img_resource){
					var resGuid = img_resource.guid;
					img_src = "https://www.evernote.com/shard/s35/res/" + resGuid;
					//console.log('IMG_SOURCE: '+img_src);
					var URL = window.URL || window.webkitURL;
					getImageFile(authTokenEvernote, guid, img_resource.guid, function(blob){
						//localStorage.setItem(guid, JSON.stringify(blob));

						//bookmarkObj.img = JSON.stringify(blob);
						//myObjectStore.upsert(bookmarkObj);
						var fileReader = new FileReader();
						fileReader.onload = function (evt) {
			                // Read out file contents as a Data URL
			                var result = evt.target.result;
			                // Set image src to Data URL
			                bookmarkObj.img = result;
			                myObjectStore.upsert(bookmarkObj);
			                // Store Data URL in localStorage
			                try {
			                    localStorage.setItem(guid, result);
			                }
			                catch (e) {
			                    console.log("Storage failed: " + e);
			                }
			            };
			            fileReader.readAsDataURL(blob);
					});
				}
				
				//$scope.notes.push(bookmarkObj);
				//console.log(cont);
				//$scope.$apply(); 
				deferred.resolve();
			});

			deferred.promise.then(
				function() {
			  		getNote(authTokenEvernote, noteStore, noteGuids);
				}, 
				function(reason) {}, 
				function(update) {}
			);
		}
	};

	var getImageFile = function (token, noteGuid, resGuid, callback) {
		var resUrl = "https://www.evernote.com/shard/s35/res/" + resGuid;
        
        // Create XHR
        var xhr = new XMLHttpRequest();

        xhr.open("POST", resUrl, true);
        // Set the responseType to blob
        xhr.responseType = "blob";

        xhr.onload = function(oEvent) {
			var blob = xhr.response;
            callback(blob);
		};

        // Send XHR
        var params = "auth="+token;
        xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        xhr.send(params);
    };

	
}