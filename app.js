
// add sizing attributes to svg with floor map
var floormap = d3.select("#floormaps")
    .attr("width", "100%")
    .attr("height", "500px")
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
.controller("floorAppController", ['$scope', 'getRequest', function directoryController($scope, getRequest) {
    
    var vm = this;

    getRequest.getData("https://wem.americasmart.com//api/v1.2/FloorPlan?building=1&floorNum=6").then(function(showrooms) {
        vm.mapBackground = showrooms[0].url;
        console.log(showrooms);
    });
}]);
