//'use strict';

angular.module('emServices', []).provider('Evernote', 
  function() {
  

  this.$get = function($q, $http) {
    var self = this;

    var path = 'https://sandbox.evernote.com/oauth?'
    var clientId = CONFIG.clientId; // 'dgolovan-0288';
    var clientSecret = CONFIG.clientSecret; //'eb3ec59147421122';
    // var redirectUri = 'https://' + chrome.runtime.id +
    //                     '.chromiumapp.org/provider_cb';
    var redirectUri = 'https://dhjehcalfiahjkkmfngekcglmliofhif.chromiumapp.org/provider_cb';
    var redirectRe = new RegExp(redirectUri + '[#\?](.*)');

    var access_token = null;
    var oauth_token_secret = "";

    var oaOpt = {
      consumerKey: clientId,
      consumerSecret: clientSecret,
      callbackUrl : redirectUri,
      signatureMethod : "HMAC-SHA1"
    };
    var oauth = OAuth(oaOpt);

    return {

      getToken: function(interactive, callback) {
        // In case we already have an access_token cached, simply return it.
        if (access_token) {
          callback(null, access_token);
          return;
        }

        //OAuth Step 1: Send request for the "request_token"
        oauth.request({'method': 'GET', 'url': 'https://sandbox.evernote.com/oauth', 'success': oaRequestTokenSuccess, 'failure': oaFailure});
      
        /**
        * Handle the success for the Step1 when we request the "request token"
        */
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
                  'interactive': interactive,
                  'url': 'https://sandbox.evernote.com/OAuth.action?oauth_token=' + request_token 
                }
                
                chrome.identity.launchWebAuthFlow(options, oaRedirectCallback);
            }
            
        }


        function oaFailure(error) {
          console.log('error ' + error.text);
        }

        /**
        * Handles the response from Step2 after user has logged in and Authorized/De-authorized access to their Evernote account
        */
        function oaRedirectCallback(redirectUri){
          console.log('launchWebAuthFlow completed', chrome.runtime.lastError, redirectUri);

          if (chrome.runtime.lastError) {
            callback(new Error(chrome.runtime.lastError));
            return;
          }

          // Upon success 
          var got_oauth, verifier = '';
          var matches = redirectUri.match(redirectRe);
          if (matches && matches.length > 1){
            response_vals = parseRedirectFragment(matches[1]);
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
            // console.log("RESPONSE_VALS:");
            // console.log(response_vals);
            // console.log("VERIFIER= "+verifier);
            // console.log("Got_Oauth= "+got_oauth);
            // console.log("Oauth_Token_Secret= "+oauth_token_secret);
            
            oauth.request({'method': 'GET', 'url': 'https://sandbox.evernote.com/oauth', 'success': handleProviderResponse, 'failure': oaFailure});
          }

          else{
            callback(new Error('Invalid redirect URI'));
          }
        }

        /**
        * Handler for the Step3 response where we should get the oauth_token that we can actually use to get Evernote data
        */
        function handleProviderResponse(responseObj) {
          var params = responseObj.text;
          var oauth_token = null;
          var edam_noteStoreUrl = '';
          console.log('providerResponse', params);
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
          if (oauth_token){
            setAccessToken(oauth_token, edam_noteStoreUrl);
          }
          else{
            callback(new Error('access_token not avialable.'));
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

        

        function setAccessToken(token, noteStoreUrl) {
          access_token = token; 
          console.log('Setting access_token: ', access_token);
          callback(null, access_token, noteStoreUrl);
        }
      },

      removeCachedToken: function(token_to_remove) {
        if (access_token == token_to_remove){
          access_token = null;
        }
      }

    }
  }
})