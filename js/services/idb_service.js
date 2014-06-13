'use strict';

angular.module('IdbModule', [])
.factory('idbFactory', 
function($q, evernoteProvider){
  var service = {};
  var active_notebook;

  var updatecnt = 0;
  
  //Open the IDB Stores
  var nbstore_def = $q.defer();
  var nbStore = new IDBStore({
		storeName:'notebooks', 
		dbVersion: 1,
		keyPath: "guid",
		autoIncrement: false,
		indexes: [],
	}, 
	function(){ nbstore_def.resolve(this); },
  function(){ nbstore_def.reject("Could not open nbStore"); });

  var bmstore_def = $q.defer();
  var bmStore = new IDBStore({
		storeName:'bookmarks', 
		dbVersion: 1,
		keyPath: "guid",
		autoIncrement: false,
		indexes: [{name: "nb_guid", keyPath: "nb_guid", unique: false, multiEntry: false}],
	},
	function(){ bmstore_def.resolve(this); },
  function(){ bmstore_def.reject("Could not open bmStore"); });


  var syncNotebooks = function(){
    var done_def = $q.defer();

    evernoteProvider.getUpdateCount().then(
    //$q.all([new_updatecnt_prom, updatecnt_prom]).then(
    function(new_updatecnt){
      console.log("Comparing");
      //If there is no change in update count, simply resolve the main promise
      if( new_updatecnt == updatecnt){ 
        done_def.resolve();
      }
      //Otherwise we need to sync
      else{
        console.log("Update counts different - syncing");
        updatecnt = new_updatecnt;
        var clear_def = $q.defer();
        nbstore_def.promise.then(function(){
          nbStore.clear(
            function(){ clear_def.resolve(true); },
            function(){ clear_def.reject("Could not clear nbStore before sync"); }
          );
        });

        var getnb_prom = evernoteProvider.getNotebooks();
        
        $q.all([clear_def.promise, getnb_prom]).then(
          function(arr){
            console.log(arr[1]);
            nbStore.putBatch(arr[1], 
              function(suc){ done_def.resolve(suc); },
              function(){ done_def.reject("Could not complete nbStore.putBatch() during syncNotebooks"); }
            );
          },
          function(){console.log("I failed miserably");}
        );
      }
    });
    return done_def.promise;
  };

  var syncNotes = function(nb_guid){
    var done_def = $q.defer();

    evernoteProvider.getUpdateCount().then(
    function(new_updatecnt){
      
      //If there is no change in update count, simply resolve the main promise
      if( new_updatecnt == updatecnt){ 
        done_def.resolve();
      }
      //Otherwise we need to sync
      else{

        updatecnt = new_updatecnt;
        var clear_def = $q.defer();
        bmstore_def.promise.then(function(){
          bmStore.clear(
            function(){ clear_def.resolve(true); },
            function(){ clear_def.reject("Could not clear bmStore before sync"); }
          );
        });

        var getbm_prom = evernoteProvider.getNotes(nb_guid);
        
        $q.all([clear_def.promise, getbm_prom]).then(
          function(arr){
            bmStore.putBatch(arr[1], 
              function(suc){ done_def.resolve(suc); },
              function(){ done_def.reject("Could not complete bmStore.putBatch() during syncNotes"); }
            );
          },
          function(){console.log("I failed miserably");}
        );

      }
    });

    return done_def.promise;
  };

  service.getNotebooks = function(){
    var done_def = $q.defer();

    $q.all([nbstore_def.promise, syncNotebooks()]).then(
    function(){
      nbStore.getAll(
        function(res){ done_def.resolve(res); },
        function(){ done_def.reject("Could not get items from nbStore"); }
      );
    });

    return done_def.promise;
  };

  service.getNotes = function(nb_guid){
    var done_def = $q.defer();

    $q.all([bmstore_def.promise, syncNotes(nb_guid)]).then(
    function(){
    //bmstore_def.promise.then(function(bmStore){
      bmStore.query(
        function(res){ 
          console.log(res); 
          done_def.resolve(res);
        }, 
        {index: "nb_guid"} 
      );
    });

    return done_def.promise;
  };

  return service;
});