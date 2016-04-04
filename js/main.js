//TO DO LIST
//1) Find out why attributes not joining? / How to view DOM
//2) Figure out where that 3rd box is coming from and delete it




//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){
//pseudo-global variables
var attrArray = ["RUCC2013", "URCSC2013", "UIC2013", "IRR2010", "IRR2010_category", "NCFC2010", "CBSA2013"];
var expressed = attrArray[0]; //initial attribute
//begin script when window loads
window.onload = setMap();
//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;
    height = 460;
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
  .scale(5000)
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
    //add color scale
    setEnumerationUnits(wiCounties, map, path, colorScale);
    wiCounties = joinData(wiCounties, csvData);
    var colorScale = makeColorScale(csvData);
    //add coordinated viz to the map
    setChart(csvData, colorScale);
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
function setEnumerationUnits(wiCounties, map, path, colorScale){
    //add counties to map
    var counties = map.selectAll(".counties")
        .data(wiCounties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "counties " + d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        });
};
//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (val && val != NaN){
        return colorScale(val);
    } else {
        return "#CCC";
  };
};
function makeColorScale(data){
    var colorClasses = [
        "#edf8fb",
        "#b2e2e2",
        "#66c2a4",
        "#2ca25f",
        "#006d2c"
    ];
    //create color scale generator
    var colorScale = d3.scale.quantile()
        .range(colorClasses);
    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);
    return colorScale;
};
function joinData(wiCounties, csvData) {
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.County; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a=0; a<wiCounties.length; a++){
            var geojsonProps = wiCounties[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME; //the geojson primary key
            console.log(geojsonKey);
            console.log(csvKey);
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    return wiCounties;
                });
            };
        };
    };
};
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 460;
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    //set bars for each province
    //create a scale to size bars proportionally to frame
    var yScale = d3.scale.linear()
        .range([0, chartHeight])
        .domain([0, 105]);
    //Example 2.4 line 8...set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
        return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.adm1_code;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        }).style("fill", function(d){
            return choropleth(d, colorScale);
        });
    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.adm1_code;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });
            //below Example 2.8...create a text element for the chart title
      var chartTitle = chart.append("text")
          .attr("x", 20)
          .attr("y", 40)
          .attr("class", "chartTitle")
          .text("Number of Variable " + expressed[1] + " in each region");

      //create a second svg element to hold the bar chart
      var chart = d3.select("body")
          .append("svg")
          .attr("width", chartWidth)
          .attr("height", chartHeight)
          .attr("class", "chart");
};

})(); //last line of main.js