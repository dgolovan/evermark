'use strict';


angular.module('EverMark', ['ngRoute', 'emServices', 'xc.indexedDB'])
// .config(function(EvernoteProvider) {
// 	EvernoteProvider.setApiKey('YOUR_API_KEY');
// })
.config(['$routeProvider', '$indexedDBProvider', function($routeProvider, $indexedDBProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'templates/home.html', 
      controller: 'MainCtrl'
    })
    // .when('/settings', {
    //   templateUrl: 'templates/settings.html',
    //   controller: 'SettingsCtrl'
    // })
    .otherwise({redirectTo: '/'});

    $indexedDBProvider
      .connection('BookmarksDB')
      .upgradeDatabase(1, function(event, db, tx){
        var objStore = db.createObjectStore('bookmarks', {keyPath: 'guid'});
        //objStore.createIndex('name_idx', 'name', {unique: false});
        //objStore.createIndex('age_idx', 'age', {unique: false});
      });
      
    //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
}]);
