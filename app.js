


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
    var _fontSize = 10;
    var _outline = 1.25;

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

      var url = floorplanAPI + "?building=" + building + "&floorNum=" + floor;
      var deferred = $q.defer();
      _building = building;
      _floor = floor;

      // return data 
      $http.get(
          url, {params: parms, cache: 'true'}
      ).then(function (data) {

          var floormap = d3.select("#floormaps");
          var mapcanvas = d3.select("#zoomCanvas");
          var markcanvas = d3.select("#placemarkCanvas");
          var container = d3.select("#map-canvas");
          var containerBox = container.node().getBoundingClientRect();

          // filter booths and add svgs and background image
          var buildingColor = (building == 1) ? "#005EC6" : (building == 2) ? "#BE0101" :  "#107F50";
          var results = data.data[0]

          // parameters to fit in viewport
          var transcale = 0.8 * ((containerBox.width / results.mapGraphic.width) > (containerBox.height / results.mapGraphic.height)) ? (containerBox.height / results.mapGraphic.height) : (containerBox.width / results.mapGraphic.width);
          _fontSize = _fontSize / transcale
          _outline = _outline / transcale

          var transx = (containerBox.width  - (transcale * results.mapGraphic.width / parseFloat(results.transforms[0].d)))  / 2.0;
          var transy = (containerBox.height - (transcale * results.mapGraphic.height / parseFloat(results.transforms[0].a))) / 2.0;

          // add background image
          var scalex = parseFloat(results.mapGraphic.width) / parseFloat(results.mapWidth);
          var scaley = parseFloat(results.mapGraphic.height) / parseFloat(results.mapHeight);

          // ----------------------------- //
          // +++      INIT D3 SVG      +++ //
          // ----------------------------- //

          var maxarea = 0.0;
          console.log(containerBox);
          // floormap.attr("preserveAspectRatio", "xMinYMin");
          floormap.attr("viewBox", "0 0 " + containerBox.width + " "  + containerBox.height);
          floormap.classed("svg-content", true);
          floormap.selectAll("g > *").remove();
          d3.select(window).on("resize", function() {
              floormap.attr("viewBox", "0 0 " + container.node().getBoundingClientRect().width + " "  + container.node().getBoundingClientRect().height); 
          });

          // add zooming
          var zoom = d3.zoom()
              .on('zoom', function() {
                  console.log('transform', d3.event.transform);
                  mapcanvas.attr('transform', d3.event.transform);
                  markcanvas.attr('transform', d3.event.transform);
              });
          // mapcanvas.call(zoom.transform, d3.zoomIdentity.translate(transx, transy).scale(transcale));
          // mapcanvas = d3.select("#zoomCanvas")
          //   .call(zoom)
          //   .call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(transcale));
          // mapcanvas.attr("transform", "transform(0, 0) scale(" + transcale + ")");
          // mapcanvas.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(transcale));
          floormap.call(d3.zoom().on("zoom", function() {
              var transform = d3.event.transform
              var labels = markcanvas.selectAll("text");
              mapcanvas.attr("transform", d3.event.transform);
              markcanvas.attr("transform", d3.event.transform);
              labels.attr('font-size', _fontSize / transform.k);
              labels.attr('stroke-width', _outline / transform.k);
              // show if it's not too big
              markcanvas.selectAll("text").each(function(d) {
                var label = d3.select(this);
                if ((transform.k) / (label.attr("ratio")) >= 0.8*(1.0 - (0.25*maxarea/label.attr("area")))) {
                  label.attr("class", "booth-label booth-label-on");
                } else {
                  label.attr("class", "booth-label booth-label-off");
                }
              })
          }));
          // zoom buttons
          d3.select('#zoom-in').on('click', function() {
              zoom.scaleBy(floormap.transition().duration(200), 1.3);
          });
          d3.select('#zoom-out').on('click', function() {
              zoom.scaleBy(floormap.transition().duration(200), 1.0 / 1.3);
          });
          // ----------------------------- //

          mapcanvas.append("svg:image")
              .attr("xlink:href", "http:" + results.mapGraphic.url)
              .attr("width", parseFloat(results.mapGraphic.width) / parseFloat(results.transforms[0].d))
              .attr("height", parseFloat(results.mapGraphic.height) / parseFloat(results.transforms[0].a))
              .attr("x", -1.0 * parseFloat(results.transforms[0].e)  / parseFloat(results.transforms[0].d))
              .attr("y", -1.0 * parseFloat(results.transforms[0].f) / parseFloat(results.transforms[0].a));

          // add booths
          _booths = results.booths.map(function(booth) {
              var color = (booth.exhibitors.length > 0) ? buildingColor : "#eee";
              var centerOfMass = {x: 0, y: 0};
              var mass = {x: 0, y: 0};
              var labels = null;
              console.log(booth);

              var next = mapcanvas.append("path")
                  .attr("id", "path" + booth.boothID)
                  .attr("d", "M" + booth.vertices.map(function(vertex) {
                      return vertex.x + " " + vertex.y;
                  }).join(" L") + "Z")
                  .attr("class", "booth-path")
                  .attr("fill", color)
                  .attr("ng-click", "vm.boothClick('" + booth.boothID + "')");
              var width = next.node().getBBox().width;
              booth.area = d3.polygonArea(booth.vertices.map(function(vertex){return [vertex.x, vertex.y];}))
              if (booth.area > maxarea) {
                maxarea = 1.0 * booth.area;
              };

              // attempt to get center of momentum so centroid placemarks are not out of the area
              mass.x = (booth.vertices[0].x - booth.vertices[booth.vertices.length-1].x)
                     * (booth.vertices[0].y + booth.vertices[booth.vertices.length-1].y);
              mass.y = (booth.vertices[0].y - booth.vertices[booth.vertices.length-1].y)
                     * (booth.vertices[0].x + booth.vertices[booth.vertices.length-1].x);
              centerOfMass.x = (Math.pow(booth.vertices[0].x, 2) - Math.pow(booth.vertices[booth.vertices.length-1].x, 2))
                                      * (booth.vertices[0].y              + booth.vertices[booth.vertices.length-1].y);
              centerOfMass.y = (Math.pow(booth.vertices[0].y, 2) - Math.pow(booth.vertices[booth.vertices.length-1].y, 2))
                                      * (booth.vertices[0].x              + booth.vertices[booth.vertices.length-1].x);
              // loop through all but last which is above in initial conditions
              for (i = 0; i < booth.vertices.length-1; i++) {
                  mass.x += (booth.vertices[i+1].x - booth.vertices[i].x)
                          * (booth.vertices[i+1].y + booth.vertices[i].y);
                  mass.y += (booth.vertices[i+1].y - booth.vertices[i].y)
                          * (booth.vertices[i+1].x + booth.vertices[i].x);
                  centerOfMass.x += (Math.pow(booth.vertices[i+1].x, 2) - Math.pow(booth.vertices[i].x, 2))
                                           * (booth.vertices[i+1].y              + booth.vertices[i].y);
                  centerOfMass.y += (Math.pow(booth.vertices[i+1].y, 2) - Math.pow(booth.vertices[i].y, 2))
                                           * (booth.vertices[i+1].x              + booth.vertices[i].x);
              }
              centerOfMass.x *= 0.5 / mass.x;
              centerOfMass.y *= 0.5 / mass.y;

              // add placemark
              markcanvas.append("circle")
                  .attr("cx", centerOfMass.x)
                  .attr("cy", centerOfMass.y)
                  .attr("r", "1")
                  .attr("stroke", "black")
                  .attr("fill", "red")
                  .attr("fill-opactiy", "0")
                  .attr("ng-click", "vm.boothClick('" + booth.boothID + "')");
              if (booth.exhibitors.length > 0) {
                var label = markcanvas.append("text")
                    .attr("x", centerOfMass.x)
                    .attr("y", centerOfMass.y + 0.5)
                    .attr('font-size', _fontSize)
                    .attr('stroke-width', _outline)
                    .attr("ng-click", "vm.boothClick('" + booth.boothID + "')")
                    .attr("data-exhibid", booth.boothID)
                    .text(booth.exhibitors.map(function(exhibitor) {
                      return exhibitor.exhibName;
                    }).join(", "));
                var ratio = parseFloat(label.node().getBBox().width) / parseFloat(width);
                label.attr("ratio", ratio);
                label.attr("area", booth.area);
                if (ratio >= 1.0) {
                  label.attr("class", "booth-label booth-label-on");
                } else {
                  label.attr("class", "booth-label booth-label-off");
                }
              }
              return booth;
          }).filter(function(booth) {
              return (booth.exhibitors.length > 0) ? 1 : 0;
          }).sort(function(a, b) {
              return (a.exhibitors[0].exhibName > b.exhibitors[0].exhibName) ? 1 : -1;
          });

          // translate everything to fit window
          mapcanvas.selectAll("*").attr("transform", "translate(" + transx + ", " + (-1.0 * transy) + ") scale(" + transcale + ")");
          markcanvas.selectAll("*").attr("transform", "translate(" + transx + ", " + (-1.0 * transy) + ") scale(" + transcale + ")");

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
mapApp.controller("mapAppController", ['$scope', '$sce', '$compile', '$routeParams', 'getRequest', 'boothService', 'getExhibitor', function directoryController($scope, $sce, $compile, $routeParams, getRequest, boothService, getExhibitor) {
    var vm = this;
    var floormap = d3.select("#floormaps");
    vm.building = 2;
    vm.floor = 2;
    vm.booths = [];
    vm.selectedBooth = null;
    vm.selectedExhibitors = [];
    vm.searchMenu = true;
    console.log($routeParams);
    if ($routeParams.hasOwnProperty('building')) {
      console.log('building');
    }
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

      // alert(vm.boothDict[boothID].exhibitors.map(function(exhibitor) {return exhibitor.exhibName}).join(',  '));
    };
    vm.clearSearch = function() {
      vm.exhibitorSearch = "";
      vm.selectedBooth = null
      vm.selectedExhibitors = [];
    };
}]);
