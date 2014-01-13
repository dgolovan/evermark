'use strict';


angular.module('EverMark', ['ngRoute', 'emServices'])
// .config(function(EvernoteProvider) {
// 	EvernoteProvider.setApiKey('YOUR_API_KEY');
// })
.config(['$routeProvider', function($routeProvider) {
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
}]);
