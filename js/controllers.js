'use strict';

function MainCtrl($scope, $timeout, Evernote) {
	// Build the date object
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

	        

	        
	        //var notes = [];

	        noteStore.findNotesMetadata(authTokenEvernote, filter, 0, 100, spec, function (noteList){
	        	// for (note in noteList.notes){
	        	// 	$scope.notes.push(note.title);
	        		
	        	// }
	        	console.log(noteList.notes);
	        	for(var i = 0, size = noteList.notes.length; i < size ; i++){
	        		console.log(noteList.notes[i].title);
	        		$scope.notes.push(noteList.notes[i].title);
	        	}
	        	$scope.$apply(); 
	        	console.log($scope.notes);
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
	
}