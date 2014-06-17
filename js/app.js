'use strict';

angular.module('EverMark', ['ngRoute', 'EvernoteModule', 'IdbModule'])
.config(function($routeProvider, evernoteProviderProvider, $compileProvider) {
  // evernoteProviderProvider.setClientParams(CONFIG); 
  
  $routeProvider
    .when('/', {
      templateUrl: 'templates/home.html', 
      controller: 'MainCtrl'
    })
    .when('/settings', {
       templateUrl: 'templates/settings.html',
       controller: 'SettingsCtrl'
    })
    .otherwise({redirectTo: '/'});

    //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(data|chrome-extension):/);
    

    // $indexedDBProvider
    //   .connection('BookmarksDB')
    //   .upgradeDatabase(1, function(event, db, tx){
    //     var objStore = db.createObjectStore('bookmarks', {keyPath: 'guid'});
    //     objStore.createIndex('nb_guid', 'nb_guid', {unique: false});
    //     var nbStore = db.createObjectStore('notebooks', {keyPath: 'guid'});
    //   });
      
});
