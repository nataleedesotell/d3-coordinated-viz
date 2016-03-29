
//wrap everything in a self-executing anonymous function to move to local scope
(function(){

//begin script when window loads
window.onload = setMap();
//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
        height = 650;
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection for the United States
    var projection = d3.geo.albers()
        .center([44, -90])
        .parallels([43, 46])
        .scale(2000)
        //offsets pixel coordinates of the projection's center in the svg container
        .translate([width / 2, height / 2])

    var path = d3.geo.path()
        .projection(projection);

    //use queue.js to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/County_Classifications.csv") //load attributes from csv
        .defer(d3.json, "data/WI_Counties.topojson") //load choropleth spatial data
        .await(callback);

    function callback(error, csvData, WI){
        //translate the Counties topojson
        var WICounties = topojson.feature(WI, WI.objects.Counties);
        console.log(WICounties);
        console.log(error);
        console.log(csvData);
        console.log("callback");
        //add WICounties to the map
        var counties = map.append("path")
          .datum(WICounties)
          .attr("class", "counties")
          .attr("d", path);
    };
};

})();
