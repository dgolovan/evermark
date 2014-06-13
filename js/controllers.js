'use strict';

function MainCtrl($scope, $timeout, $sce, $q, evernoteProvider, idbFactory) {
  $scope.to_trusted = function(html_code){
     return $sce.trustAsHtml(html_code);
    }

  $scope.notebooks = []; 
  $scope.notes = [];
  $scope.nbGUID = localStorage.getItem('nbGUID') || "";   

  $scope.changeNB = function(guid){
      $scope.nbGUID = guid;
      localStorage.setItem('nbGUID', guid);
      getNotes($scope.nbGUID);
  };

  var updateNotebooks = function(){
    idbFactory.getNotebooks().then(
    function(nbs){
      $scope.notebooks = nbs;
    });
  };
  updateNotebooks();
  // evernoteProvider.getUpdateCount().then(function(cnt){ console.log(cnt);});

  var getNotes = function(nbGUID){
    idbFactory.getNotes(nbGUID).then(
    function(nts){
      $scope.notes = nts;
    });
  };
  
}
