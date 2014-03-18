'use strict';

angular.module('EverMark', ['ngRoute', 'emServices', 'xc.indexedDB'])
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
      });
      
}]);
