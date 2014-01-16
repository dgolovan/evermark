'use strict';

function MainCtrl($scope, $timeout, Evernote, $sce) {
	
	$scope.to_trusted = function(html_code){
 	   return $sce.trustAsHtml(html_code);
    }

	$scope.notes = [];

	
	Evernote.getToken( true, 
		function(error, authTokenEvernote, noteStoreURL) {
	        console.log('token fetch', error, authTokenEvernote);
	        
	        //var noteStoreURL = querystring.edam_noteStoreUrl;
	        var noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL);
	        var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
	        var noteStore = new NoteStoreClient(noteStoreProtocol);
	        console.log("URL= "+noteStoreURL);
	        
	        var nbGUID = "05746dd7-fa2c-4ac4-92a1-c1ad5c7febb9"; //This will be later setup through settings screen
	        var filter = new NoteFilter();
	        filter.notebookGuid = nbGUID;

	        var spec = new NotesMetadataResultSpec();
			spec.includeTitle = true;

	        
	        var noteGuids = [];

	        noteStore.findNotesMetadata(authTokenEvernote, filter, 0, 100, spec, function (noteList){   	
	        	for(var i = 0, size = noteList.notes.length; i < size ; i++){
	        		//$scope.notes.push(noteList.notes[i].title);
	        		noteGuids.push({guid: noteList.notes[i].guid, title: noteList.notes[i].title});
	        	}
	        	//$scope.$apply(); 
	        	//console.log(noteGuids);
	        	getNotes(authTokenEvernote, noteStore, noteGuids);
	        	//$scope.$apply(); 
	        });
	        

	  //       noteStore.listNotebooks(authTokenEvernote, function (notebooks) {
		 //        console.log(notebooks);
		     
		 //        // for(notebook in notebooks){

		 //        // }
		 //        // $scope.notebooks = notebooks;
		 //    },
		 //    function onerror(error) {
		 //        console.log(error);
		 //    }
			// );
      });

	var getNotes = function(authTokenEvernote, noteStore, noteGuids){
		var parser = new DOMParser();
		for(var i = 0, size = noteGuids.length; i < size ; i++){
			var guid = noteGuids[i].guid;
			
			noteStore.getNote(authTokenEvernote, guid, true,true,true,true,function(noteRes){
				var doc = parser.parseFromString(noteRes.content, "application/xml");
				var title = noteRes.title;
				var cont = "";	
				var en = doc.getElementsByTagName("en-note");
				var oSerializer = new XMLSerializer();
				var asXML = oSerializer.serializeToString(en.item(0));
				//console.log(sXML);
				// var en_kids = en.item(0).childNodes;
				// for (var i = 0; i < en_kids.length; i++) {
				// 	var elem = en_kids[i];
				// 	//cont = cont + elem.outerHTML;
				// 	console.log(elem.innerHTML);
				// }
				//$scope.notes.push({title: title, content: els.item(0).textContent});
				$scope.notes.push({title: title, content: asXML});
				//console.log(cont);
				$scope.$apply(); 
			});

	        		
	        		
		//	console.log(noteGuids);
		}
		
	};
	
}