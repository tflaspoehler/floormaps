// based on https://observablehq.com/@d3/zoom-to-bounding-box?collection=@d3/d3-zoom

///var svg = d3.select("#map")
///  .append("svg")
///    .attr("width", 460)
///    .attr("height", 460)
///    .call(d3.zoom().on("zoom", function() {
///      svg.attr("transform", d3.event.transform);
///    }))
///    .append("g");
///
///  svg.append("circle")
///    .attr("cx", 300)
///    .attr("cy", 300)
///    .attr("r", 40)
///    .style("fill", "#68b2a1");


var vector = d3.select("#vectors").call(d3.zoom().on("zoom", function() {
      vector.select("g").attr("transform", d3.event.transform);
    }));

