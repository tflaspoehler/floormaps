
// add sizing attributes to svg with floor map
var floormap = d3.select("#floormaps")
//    .attr("width", "100%")
  //  .attr("height", "500px")
    .attr("preserveAspectRatio", "xMinYMin")
    .attr("viewBox", "0 0 300 300")
    .classed("svg-content", true);
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


floorApp = angular.module("floorApp", ['ngRoute'])

//-----------------------------------------------------------------------//
// change scope templating string to insert angular stuff from ${} to    //
//      without this hubspot will not play nice with angular             //
//-----------------------------------------------------------------------//
.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('//');
    $interpolateProvider.endSymbol('//');
}])
//-------------------------------------------------------------------//

//----------------------------------//
//   service to get http requests   //
//----------------------------------//
.service('getRequest', ['$http', function($http) {
    var getData = function(request, parms={}) {
        return $http.get(request, {params: parms, cache: 'true' }).then(function(response) {
            return response.data;
        });
    };
    return {
        getData: getData
    };
}])
//----------------------------------//

//-----------------------------------------------------------------------//
//      controller to sends AJAX request and returns it to the view      //
//-----------------------------------------------------------------------//
.controller("floorAppController", ['$scope', '$sce', 'getRequest', function directoryController($scope, $sce, getRequest) {
    
    var vm = this;
    vm.building = 3;
    vm.floor = 6;
    var buildingColor = (vm.building == 1) ? "rgb(0, 0, 255)" : (vm.building == 2) ? "rgb(255, 0, 0)" :  "rgb(0, 255, 0)";
    getRequest.getData("https://wem.americasmart.com//api/v1.2/FloorPlan?building=" + vm.building + "&floorNum=" + vm.floor).then(function(showrooms) {
        
        // add background image
        console.log(showrooms);
        var scalex = parseFloat(showrooms[0].mapGraphic.width) / parseFloat(showrooms[0].mapWidth);
        var scaley = parseFloat(showrooms[0].mapGraphic.height) / parseFloat(showrooms[0].mapHeight);
        var transform = "matrix(" + [showrooms[0].transforms[0].a, showrooms[0].transforms[0].b, showrooms[0].transforms[0].c, showrooms[0].transforms[0].d, showrooms[0].transforms[0].e, showrooms[0].transforms[0].f].join(" ") + ")";

        floormap.select("g").append("svg:image")
          .attr("xlink:href", "http:" + showrooms[0].mapGraphic.url)
          .attr("width", showrooms[0].mapGraphic.width / showrooms[0].transforms[0].d)
          .attr("height", showrooms[0].mapGraphic.height / showrooms[0].transforms[0].a)
          .attr("x", -1.0 * showrooms[0].transforms[0].e  / showrooms[0].transforms[0].d)
          .attr("y", -1.0 * showrooms[0].transforms[0].f / showrooms[0].transforms[0].a);

        // add booths
        vm.booths = showrooms[0].booths.map(function(booth) {
          var color = (booth.exhibitors.length > 0) ? buildingColor : "rgb(0, 0, 0)";
          floormap.select("g").append("path")
            .attr("d", "M" + booth.vertices.map(function(vertex) {
              return vertex.x + " " + vertex.y;
            }).join(" L") + "Z")
            .attr("class", "booth-path")
          .attr("fill", color);
          return booth;
        }).filter(function(booth) {
          return (booth.exhibitors.length > 0) ? 1 : 0;
        });
        console.log(vm.booths);

    });
}]);
