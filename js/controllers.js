'use strict';

function MainCtrl($scope, $timeout, $sce, $q, evernoteProvider, idbFactory) {
  $scope.to_trusted = function(html_code){
    return $sce.trustAsHtml(html_code);
  }

  $scope.notes = [];
  $scope.nbGUID = localStorage.getItem('nbGUID') || "";   

  var getNotes = function(nbGUID){
    idbFactory.getNotes(nbGUID).then(
    function(nts){
      $scope.notes = nts;
    },
    function(){console.log("smth went wrong"); });
  };
  
  getNotes($scope.nbGUID);
}

function SettingsCtrl($scope, idbFactory) {
  $scope.notebooks = []; 
  $scope.nbGUID = localStorage.getItem('nbGUID') || "";  

  $scope.changeNB = function(guid){
    $scope.nbGUID = guid;
    localStorage.setItem('nbGUID', guid);
    getNotes(guid);
  };

  var updateNotebooks = function(){
    idbFactory.getNotebooks().then(
    function(nbs){
      $scope.notebooks = nbs;
    });
  };

  updateNotebooks();
}