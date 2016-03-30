//start script when the window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
  //map frame dimensions
  var width = 900,
    height = 900;

  //create new svg container for the map
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

    //create Albers equal area conic projection
  var projection = d3.geo.albers()
  //set a center (thought this should be 44, -89?)
  .center([-0.00, 44.437778])
  //not sure what rotate does exactly
  .rotate([90.130186, 0, 0])
  //parallels -- not sure if these are right
  .parallels([42, 46])
  //scale -- sizes the map
  .scale(9000)
  .translate([width / 2, height / 2]);

  //create a path generator
  var path = d3.geo.path()
  //pass it our projection generator as the parameter
    .projection(projection);

  //use queue.js to parallelize asynchronous data loading
  d3_queue.queue()
    .defer(d3.csv, "data/County_Classifications.csv") //load attributes from csv
    .defer(d3.json, "data/WI_Counties.topojson") //load choropleth spatial data
    //firess when all the data is loaded, sends all data to the callback function
    .await(callback);
 
//set up callback function with 3 parameters within setMap() so it can use variables above
  function callback(error, csvData, wi){
    //translate WI TopoJSON using the topojson.feature() method
    var wiCounties = topojson.feature(wi, wi.objects.WI_Counties).features;
    //console.log(wiCounties)
    //add WI counties to map, create enumeration units
    var counties = map.selectAll(".counties")
        .data(wiCounties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "counties" + d.properties.CTY_FIPS;
        })
        .attr("d", path);
    };
};
