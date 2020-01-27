


mapApp = angular.module("mapApp", ['ngRoute']);

//-----------------------------------------------------------------------//
// change scope templating string to insert angular stuff from ${} to    //
//      without this hubspot will not play nice with angular             //
//-----------------------------------------------------------------------//
mapApp.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('//');
    $interpolateProvider.endSymbol('//');
}]);
//-------------------------------------------------------------------//

//--------------------------------------------//
// filter to encode urls for links and images //
//--------------------------------------------//
mapApp.filter('escape', function() {
  return window.encodeURI;
});
//----------------------------------//

//----------------------------------//
//   service to get http requests   //
//----------------------------------//
mapApp.service('getRequest', ['$http', function($http) {
    var getData = function(request, parms={}) {
        return $http.get(request, {params: parms, cache: 'true' }).then(function(response) {
            return response.data;
        });
    };
    return {
        getData: getData
    };
}]);
//----------------------------------//

//------------------------------------------//
//   get showrooms and add to controller    //
//------------------------------------------//------------------------//
//                 read through this to rebuil this app               //
//                  in terms of factories and services                //
// https://tylermcginnis.com/angularjs-factory-vs-service-vs-provider //
//------------------------------------------//------------------------//
mapApp.service('boothService', ['$http', '$q', function($http, $q) {
    // private constant variables
    var floorplanAPI = "https://wem.americasmart.com//api/v1.2/FloorPlan"

    // private editable through setters and getters
    var _building = null;
    var _floor = null;
    var _booths = [];

    // return booths if anything has changed if not get booths
    this.booths = function(building, floor) {
      if (building == _building && floor == _floor) {
        return _booths;
      } else {
        return this.getBooths(building ,floor).then(function(booths) {
          return booths;
        });
      }
    }

    // ------------------------------------------------------ //
    // return promise of getting booths and set our own stuff //
    // ------------------------------------------------------ //
    this.getBooths = function(building, floor, parms={}) {


      // ----------------------------- //
      // +++      INIT D3 SVG      +++ //
      // ----------------------------- //
      var floormap = d3.select("#floormaps")
          .attr("preserveAspectRatio", "xMinYMin")
          .attr("viewBox", "0 0 300 300")
          .classed("svg-content", true);
      floormap.selectAll("g > *").remove();
      // add zooming
      var zoom = d3.zoom()
          .on('zoom', function() {
              floormap.select("g");
              floormap.select("g").attr('transform', d3.event.transform);
          });
      floormap.call(d3.zoom().on("zoom", function() {
          floormap.select("g").attr("transform", d3.event.transform);
      }));
      // zoom buttons
      d3.select('#zoom-in').on('click', function() {
          zoom.scaleBy(floormap.transition().duration(200), 1.3);
      });
      d3.select('#zoom-out').on('click', function() {
          zoom.scaleBy(floormap.transition().duration(200), 1.0 / 1.3);
      });
      // ----------------------------- //


      var url = floorplanAPI + "?building=" + building + "&floorNum=" + floor;
      var deferred = $q.defer();
      _building = building;
      _floor = floor;

      // return data 
      $http.get(
          url, {params: parms, cache: 'true'}
      ).then(function (data) {
          // filter booths and add svgs and background image
          var buildingColor = (building == 1) ? "#005EC6" : (building == 2) ? "#BE0101" :  "#107F50";
          var results = data.data[0]
          console.log(results, results.mapGraphic.url);

          // add background image
          var scalex = parseFloat(results.mapGraphic.width) / parseFloat(results.mapWidth);
          var scaley = parseFloat(results.mapGraphic.height) / parseFloat(results.mapHeight);
          floormap.select("g").append("svg:image")
              .attr("xlink:href", "http:" + results.mapGraphic.url)
              .attr("width", parseFloat(results.mapGraphic.width) / parseFloat(results.transforms[0].d))
              .attr("height", parseFloat(results.mapGraphic.height) / parseFloat(results.transforms[0].a))
              .attr("x", -1.0 * parseFloat(results.transforms[0].e)  / parseFloat(results.transforms[0].d))
              .attr("y", -1.0 * parseFloat(results.transforms[0].f) / parseFloat(results.transforms[0].a));

          // add booths
          _booths = results.booths.map(function(booth) {
              var color = (booth.exhibitors.length > 0) ? buildingColor : "#eee";
              console.log(booth);

              floormap.select("g").append("path")
                  .attr("id", "path" + booth.boothID)
                  .attr("d", "M" + booth.vertices.map(function(vertex) {
                      return vertex.x + " " + vertex.y;
                  }).join(" L") + "Z")
                  .attr("class", "booth-path")
                  .attr("fill", color)
                  .attr("ng-click", "vm.boothClick('" + booth.boothID + "')");

              booth.area = d3.polygonArea(booth.vertices.map(function(vertex){return [vertex.x, vertex.y];}));
              return booth;
          }).filter(function(booth) {
              return (booth.exhibitors.length > 0) ? 1 : 0;
          }).sort(function(a, b) {
              return (a.exhibitors[0].exhibName > b.exhibitors[0].exhibName) ? 1 : -1;
          });

          //return booths
          deferred.resolve(_booths);
      }, function (error) {
          deferred.reject('There was an error', error);
      });

      // return the promise 
      return deferred.promise;
    }
    // ------------------------------------------------------ //

}]);
//----------------------------------//

//------------------------------------------//
//        get exhibitor information         //
//------------------------------------------//
mapApp.factory('getExhibitor', ['$http', '$q', function($http, $q) {

    // ------------------------------------//
    // this is setup the way it is so that //
    //  there can be multiple instanaces   //
    // ------------------------------------//
    var exhibitor = function() {};
    exhibitor.prototype.send = function(exhibID, parms={}) {
      var url = "https://wem.americasmart.com/api/Exhibitor?exhibitorID=" + exhibID;
      var deferred = $q.defer();
      // return data 
      $http.get(
          url, {params: parms, cache: 'true'}
      ).then(function (data) {
          console.log("DATA", data);
          deferred.resolve(data);
      }, function (error) {
          console.log("ERROR", error);
          deferred.reject('There was an error', error);
      });
    };

    // ------------------------------------//
    //   unique instance being returned by //
    //       getExhibitor.get(exhibID)     //
    // ------------------------------------//
    return {
      get: function() {
        return new exhibitor();
      }
    }
    // ------------------------------------//
    // ------------------------------------//
}]);

//-----------------------------------------------------------------------//
//      controller to sends AJAX request and returns it to the view      //
//-----------------------------------------------------------------------//
mapApp.controller("mapAppController", ['$scope', '$sce', '$compile', 'getRequest', 'boothService', 'getExhibitor', function directoryController($scope, $sce, $compile, getRequest, boothService, getExhibitor) {
    var vm = this;
    var floormap = d3.select("#floormaps");
    vm.building = 1;
    vm.floor = 15;
    vm.booths = [];
    vm.selectedBooth = null;
    vm.selectedExhibitors = [];
    vm.searchMenu = true;
    boothService.getBooths(vm.building, vm.floor).then(function(booths) {
      var bts = {};
      booths.forEach(function(booth) {
        bts[booth.boothID] = booth;
      });
      vm.boothDict = bts;
      vm.booths = booths;
      // compile d3 elements everything into angular
      $compile(floormap.node())($scope);
    });
    vm.boothClick = function(boothID) {
      var boothPath =  d3.select("#path" + boothID);
      vm.searchMenu = true;
      if (vm.selectedBooth) {
        vm.selectedExhibitors = [];
        d3.select("#path" + vm.selectedBooth).attr("class", "booth-path");
      }

      boothPath.attr("class", "booth-path booth-selected");
      vm.selectedBooth = boothID;

      vm.exhibitorSearch = vm.boothDict[boothID].exhibitors.map(function(exhibitor) {return exhibitor.exhibName}).join(',  ');
      
      // ------------------------------------------------- //
      // send request to get current exhibitor information //
      // ------------------------------------------------- //
      vm.boothDict[boothID].exhibitors.forEach(function(exhibitor) {
        console.log("getting more information about exhibitor", exhibitor.exhibID);
        getRequest.getData("https://wem.americasmart.com/api/Exhibitor?exhibitorID=" + exhibitor.exhibID).then(function(data) {
          vm.boothDict[boothID].exhibitors.forEach(function(exhib) {
            if (exhib.exhibName == data.showroomName) {
              console.log("selectedExhibitor", data);
              data.description = $sce.trustAsHtml(data.description);
              data.logo = data.logo;
              data.href = 'https://www.americasmart.com/browse/#/exhibitor/' + data.exhibitorID;
              vm.selectedExhibitors.push(data);
            }
          });
        });
      });
      // ------------------------------------------------- //

      console.log("bounding box", d3.select("#path" + boothID).node().getBBox());
      console.log("g", d3.select("#zoomCanvas").attr('transform'));

      // alert(vm.boothDict[boothID].exhibitors.map(function(exhibitor) {return exhibitor.exhibName}).join(',  '));
    };
    vm.clearSearch = function() {
      vm.exhibitorSearch = "";
      vm.selectedBooth = null
      vm.selectedExhibitors = [];
    };
}]);
