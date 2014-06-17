'use strict';

angular.module('IdbModule', [])
.factory('idbFactory', 
function($q, evernoteProvider){
  var service = {};
  var active_notebook;

  var nb_updatecnt = localStorage.getItem('nb_updatecnt') || 0;
  var bm_updatecnt = localStorage.getItem('bm_updatecnt') || 0;
  
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

  var clearStore = function(store){
    var done_def = $q.defer();

    store.clear(
      function(){ done_def.resolve(true); },
      function(){ done_def.reject("Could not clear IDBStore"); }
    );

    return done_def.promise;
  };


  var syncNotebooks = function(){
    var done_def = $q.defer();

    evernoteProvider.getUpdateCount().then(
    //$q.all([new_updatecnt_prom, updatecnt_prom]).then(
    function(new_updatecnt){
      //If there is no change in update count, simply resolve the main promise
      if( new_updatecnt == nb_updatecnt){ 
        done_def.resolve();
      }
      //Otherwise we need to sync
      else{
        evernoteProvider.getNotebooks().then(
        function(notebooks){
          nbstore_def.promise.then(
          function(){
            clearStore(nbStore).then(
            function(){
              nbStore.putBatch(notebooks, 
                function(suc){ 
                  nb_updatecnt = new_updatecnt;
                  localStorage.setItem('nb_updatecnt', nb_updatecnt);
                  done_def.resolve(suc); 
                },
                function(){ done_def.reject("Could not complete nbStore.putBatch()during syncNotebooks"); }
              );
            });
          });
        },
        function(){
          done_def.reject("Could not get the Notebooks through evernoteProvider");
        });
      }
    });
    return done_def.promise;
  };

  var syncNotes = function(nb_guid){
    var done_def = $q.defer();
    
    evernoteProvider.getUpdateCount().then(
    function(new_updatecnt){
      //If there is no change in update count, simply resolve the main promise
      if( new_updatecnt == bm_updatecnt ){ 
        done_def.resolve();
      }
      //Otherwise we need to sync
      else{
        evernoteProvider.getNotes(nb_guid).then(
        function(notes){
          bmstore_def.promise.then(
          function(){
            clearStore(bmStore).then(
            function(){
              bmStore.putBatch(notes, 
                function(suc){ 
                  bm_updatecnt = new_updatecnt;
                  localStorage.setItem('bm_updatecnt', bm_updatecnt);
                  done_def.resolve(suc); 
                },
                function(){ done_def.reject("Could not complete bmStore.putBatch()during syncNotes"); }
              );
            });
          });
        },
        function(){
          done_def.reject("Could not get the Notes through evernoteProvider");
        });

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
      bmStore.query(
        function(res){ 
          done_def.resolve(res);
        }, 
        {index: "nb_guid"} 
      );
    });

    return done_def.promise;
  };

  return service;
});