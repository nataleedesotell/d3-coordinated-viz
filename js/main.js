//start script when the window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
  //map frame dimensions
  var width = 1000,
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
  .center([6.1, 45.8])
  //not sure what rotate does exactly
  //.rotate([+38, 0])
  //parallels -- not sure if these are right
  .parallels([44, 46])
  //scale -- sizes the map
  .scale(10000)
  // .translate([width / 480, height / 250]);

  //create a path generator
  var path = d3.geo.path()
    .projection(projection);

  //use queue.js to parallelize asynchronous data loading
  d3_queue.queue()
    .defer(d3.csv, "data/County_Classifications.csv") //load attributes from csv
    .defer(d3.json, "data/WI_Counties.topojson") //load choropleth spatial data
    .await(callback);

  function callback(error, csvData, wi){
    //translate wisconsin TopoJSON
    var wiCounties = topojson.feature(wi, wi.objects.WI_Counties).features;
    console.log(wiCounties)
    //add Wisconsin counties to map
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
