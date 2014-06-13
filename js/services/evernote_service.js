'use strict';


angular.module('EvernoteModule', [])
.provider('evernoteProvider', 
function() {

  var injector = angular.injector(['ng']);
  var $q = injector.get('$q');
  
  var clientId, clientSecret;

  //This Setter is used in App's config
  this.setClientParams = function(config){
    //console.log("SET CLIENT PARAMS!");
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  };

  this.clientId = CONFIG.clientId;
  this.clientSecret = CONFIG.clientSecret;

  var path = 'https://www.evernote.com';
  var redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb';
  var redirectRX = new RegExp(redirectUri + '[#\?](.*)');

  var access_token = null;
  var notestore_url = null;

  var oauth_token_secret = "";

  var oaOpt = {
    consumerKey: this.clientId,
    consumerSecret: this.clientSecret,
    callbackUrl : redirectUri,
    signatureMethod : "HMAC-SHA1"
  };
  
  var oauth = OAuth(oaOpt);

  var token_def = $q.defer();
  
  //Handle the success for the Step1 when we request the "request token"
  function oaRequestTokenSuccess(data) {
      var isCallBackConfirmed = false;
      var request_token = '';
      
      //Process the variables we got in response
      var vars = data.text.split("&");
      for (var i = 0; i < vars.length; i++) {
          var y = vars[i].split('=');
          if(y[0] === 'oauth_token')  {
              request_token = y[1];
          }
          else if(y[0] === 'oauth_token_secret') {
              oauth_token_secret = y[1];
              //localStorage.setItem("oauth_token_secret", y[1]);
          }
          else if(y[0] === 'oauth_callback_confirmed') {
              isCallBackConfirmed = true;
          }
      }

      var ref;
      if(isCallBackConfirmed) {
          
          //OAuth Step 2: Authorization URL
          //This is done with Google's launchWebAuthFlow since it involves the redirect url, which is handled by google since we're an installed app
          var options = {
            'interactive': true,
            'url': path+'/OAuth.action?oauth_token=' + request_token 
          }
          chrome.identity.launchWebAuthFlow(options, oaRedirectCallback);
      }
      else{
        token_def.reject(new Error('Callback not confirmed'));
      }  
  }

 
  //Handles the response from Step2 after user has logged in and 
  //Authorized/De-authorized access to their Evernote account
  function oaRedirectCallback(redirectUri){
    console.log('launchWebAuthFlow completed', chrome.runtime.lastError, redirectUri);

    if (chrome.runtime.lastError) {
      // console.log("HERE WE CALL ERROR CALLBACK");
      token_def.reject(new Error(chrome.runtime.lastError));
      
      //callback(new Error(chrome.runtime.lastError));
      return;
    }

    // Upon success 
    var got_oauth, verifier = '';
    var matches = redirectUri.match(redirectRX);
    if (matches && matches.length > 1){
      var response_vals = parseRedirectFragment(matches[1]);
      if (response_vals.hasOwnProperty('oauth_token')){
        got_oauth = response_vals.oauth_token;
      }
      if (response_vals.hasOwnProperty('oauth_verifier')){
        verifier = response_vals.oauth_verifier;
      }
     
      // step 3
      oauth.setVerifier(verifier);
      oauth.setAccessToken([got_oauth, oauth_token_secret]);

      var getData = {'oauth_verifier':verifier};
      
      oauth.request({'method': 'GET', 'url': path+'/oauth', 'success': handleProviderResponse, 'failure': oaFailure});
    }

    else{
      token_def.reject(new Error('Invalid redirect URI'));
    }
  }

  
  //Handler for the Step3 response where we should get the oauth_token 
  //that we can actually use to get Evernote data
  function handleProviderResponse(responseObj) {
    var params = responseObj.text;
    var oauth_token = null;
    var edam_noteStoreUrl = '';
    // console.log('providerResponse', params);
    params = params.split('&');
    for (var i = 0; i < params.length; i++) {
        var y = params[i].split('=');
        if(y[0] === 'oauth_token') {
            oauth_token = OAuth.urlDecode(y[1]);
        }
        else if(y[0] === 'edam_noteStoreUrl') {
            edam_noteStoreUrl = OAuth.urlDecode(y[1]);
        }
    }
    if (oauth_token && edam_noteStoreUrl){
      // token_def.resolve({'em_access_token': oauth_token, 'em_notestore_url': edam_noteStoreUrl});
      setAccessToken(oauth_token, edam_noteStoreUrl);
    }
    else{
      token_def.reject(new Error('Access token or notestore url is not avialable'));
    }
  }

  function parseRedirectFragment(fragment) {
    var pairs = fragment.split(/&/);
    var values = {};

    pairs.forEach(function(pair) {
      var nameval = pair.split(/=/);
      values[nameval[0]] = nameval[1];
    });

    return values;
  }

  function setAccessToken(access_token, notestore_url) {
    chrome.storage.local.set({'em_access_token': access_token, 'em_notestore_url': notestore_url}, function() {
      // Notify that we saved the token
       // console.log('Chrome storage: token saved');
    });
   
    // console.log('Setting access_token: ', access_token);

    token_def.resolve({'em_access_token': access_token, 'em_notestore_url': notestore_url});
  }

  function oaFailure(error) {
    token_def.reject(new Error(error.text));
    console.log('error ' + error.text);
  }

  function getToken() {
        
    // In case we already have an access_token cached, simply return it.
    chrome.storage.local.get(['em_access_token', 'em_notestore_url'], function(items) {
      if (items.hasOwnProperty('em_access_token') && items.hasOwnProperty('em_notestore_url')){
        console.log("We already have a token in storage");
        // console.log(items);
        access_token = items.em_access_token;
        notestore_url = items.em_notestore_url;

        token_def.resolve({'em_access_token': access_token, 'em_notestore_url': notestore_url});
        
      }
      else{
        console.log("No token found in storage, continuing with OAuth flow");
        oauth.request({'method': 'GET', 'url': path+'/oauth', 'success': oaRequestTokenSuccess, 'failure': oaFailure});
      }

    });

    return token_def.promise;
  }


  //Main piece
  this.$get = function($q){
    //oauth = OAuth(oaOpt);
    
    var have_token = $q.defer();
    var access_token, notestore_url, noteStore;
    getToken().then(
    function(precious){
      access_token = precious['em_access_token'];
      notestore_url = precious['em_notestore_url'];
      var noteStoreTransport = new Thrift.BinaryHttpTransport(notestore_url);
      var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
      noteStore = new NoteStoreClient(noteStoreProtocol);
      have_token.resolve();
    });

    //Helper function that fetches the note from Evernote Notestore
    function getNote(authTokenEvernote, noteStore, noteGuid){
      var done_def = $q.defer();
      
      have_token.promise.then(
      function(){
        console.log("GET NOTE");
        noteStore.getNote(access_token, noteGuid, true,true,false,false,
        function(noteRes){
          console.log(noteRes);
          var parser = new DOMParser();
          var serializer = new XMLSerializer();
          var doc = parser.parseFromString(noteRes.content, "application/xml");
          var anc = doc.getElementsByTagName("a");
          if(anc.length > 0){
            anc = anc.item(0);
            anc.parentNode.removeChild(anc);
          }
          var en = doc.getElementsByTagName("en-note").item(0);

          var title = noteRes.title;
          var nb_guid = noteRes.notebookGuid;
          var url = (noteRes.attributes)? noteRes.attributes.sourceURL || "" : "";
          var img_src = "";
          var cont = en.textContent;

          var bookmarkObj = {guid: guid, nb_guid: nb_guid, title: title, url: url, content: cont};
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
            getImageFile(authTokenEvernote, guid, img_resource.guid).then(
            function(blob){
              //localStorage.setItem(guid, JSON.stringify(blob));
              //bookmarkObj.img = JSON.stringify(blob);
              var fileReader = new FileReader();
              fileReader.onload = function (evt) {
                // Read out file contents as a Data URL
                var result = evt.target.result;
                // Set image src to Data URL
                bookmarkObj.img = result;
                // bmStore.put(bookmarkObj);

                // Store Data URL in localStorage
                try {
                    localStorage.setItem(guid, result);
                }
                catch (e) {
                    console.log("Storage failed: " + e);
                }
                done_def.resolve(bookmarkObj)
              };
              fileReader.readAsDataURL(blob); 
            });
          }
          else{
            done_def.resolve()
          }

        });
      });

      return done_def.promise;
    }

    function getImageFile(token, noteGuid, resGuid) {
      var done_def = $q.defer();
      var resUrl = "https://www.evernote.com/shard/s35/res/" + resGuid;
        
      //Create & configure XHR
      var xhr = new XMLHttpRequest();
      xhr.open("POST", resUrl, true);
      xhr.responseType = "blob";
      xhr.onload = function(oEvent) {
        done_def.resolve(xhr.response);
      };

      // Send XHR
      xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
      xhr.send("auth="+token);

      return done_def.promise;
    }

		// This the final object returned by our $get function
		return {
      getUpdateCount: function(){
        var done_def = $q.defer();
        
        var updateCount;

        have_token.promise.then(
        function(){      
          noteStore.getSyncState(access_token,
          function(currentState){
            updateCount = currentState.updateCount;
            done_def.resolve(updateCount);
          });
        });

        return done_def.promise;
      },

      getNotebooks: function(){
        var def = $q.defer();
        var notebook_array = [
        {guid: "c307a40f-6175-4529-8898-6de4695671ee", name: "Bookmarks"},
        {guid: "c307a40f-6175-4529-8898-6de4695671ef", name: "Moleskin"}
        ];

        def.resolve(notebook_array);

        return def.promise;
      },

      getNotebooksOFF: function(){
        var def = $q.defer();
        getToken().then(
        function(precious){
          var noteStoreTransport = new Thrift.BinaryHttpTransport(precious["em_notestore_url"]);
          var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
          var noteStore = new NoteStoreClient(noteStoreProtocol);
          var notebook_array = [];
          noteStore.listNotebooks(precious['em_access_token'], function (notebooks) {
            for(var i=0; i < notebooks.length; i++){
              var nbObject = {'guid': notebooks[i].guid, 'name': notebooks[i].name};
              notebook_array.push(nbObject);
              //nbStore.put(nbObject);
            }
            def.resolve(notebook_array);
          });
          
        
        });
        return def.promise;
      },

      getNotes: function(nbGUID){
        var done_def = $q.defer();
        var notes_array = [
        {guid: "c307a40f-6175-4529-8898-6de4695671ea", nb_guid: "c307a40f-6175-4529-8898-6de4695671ee", title: "Bookmark 1", url: "www.denisgolovan.com", content: "Denis Golovan is the best Full-Stack Developer"},
        {guid: "c307a40f-6175-4529-8898-6de4695671eb", nb_guid: "c307a40f-6175-4529-8898-6de4695671ee", title: "Bookmark 2", url: "www.denisgolovan.com", content: "Denis Golovan is the best Full-Stack Developer"},
        {guid: "c307a40f-6175-4529-8898-6de4695671ec", nb_guid: "c307a40f-6175-4529-8898-6de4695671ee", title: "Bookmark 3", url: "www.denisgolovan.com", content: "Denis Golovan is the best Full-Stack Developer"},
        {guid: "c307a40f-6175-4529-8898-6de4695671ed", nb_guid: "c307a40f-6175-4529-8898-6de4695671ee", title: "Bookmark 4", url: "www.denisgolovan.com", content: "Denis Golovan is the best Full-Stack Developer"},
        {guid: "c307a40f-6175-4529-8898-6de4695671ee", nb_guid: "c307a40f-6175-4529-8898-6de4695671ee", title: "Bookmark 5", url: "www.denisgolovan.com", content: "Denis Golovan is the best Full-Stack Developer"}
        ];

        done_def.resolve(notes_array);

        return done_def.promise;
      },

			getNotesOFF: function(nbGUID){
				var done_def = $q.defer();
        
        var noteguid_def = $q.defer();

        var noteGuids = [];
        have_token.promise.then(
        function(){      
          var filter = new NoteFilter();
          filter.notebookGuid = nbGUID;

          var spec = new NotesMetadataResultSpec();
          spec.includeTitle = true;

          noteStore.findNotesMetadata(access_token,filter,0,100,spec, 
          function (noteList){   
            console.log(noteList);
            if(noteList.notes){
              
              for(var i = 0; i < noteList.notes.length; i++){
                noteGuids.push({guid: noteList.notes[i].guid, title: noteList.notes[i].title});
              }
            }
            noteguid_def.resolve();
          });
        });

        noteguid_def.promise.then(
        function(){
          console.log(noteGuids);
          var notes_array = [];
          var promise_array = [];
          for(var i=0; i < noteGuids.length; i++){
            var promise = getNote(access_token, noteStore, noteGuids[i]);
            promise.then(function(note){ notes_array.push(note); });
            promise_array.push(promise);
          }

          $q.all(promise_array).then(function(){ done_def.resolve(notes_array); });
        });

        return done_def;
			}
		}
	};

});