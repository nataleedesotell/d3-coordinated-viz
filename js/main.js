//First line of  code wraps everything in a self-executing anonymous function to move to local scope
(function(){
//pseudo-global variables
//my list of attributes (rurality classifications by county)
var attrArray = ["RUCC2013", "URCSC2013", "UIC2013", "IRR2010", "IRR2010Category", "NCFC2010", "CBSA2013"];
var expressed = attrArray[0]; //initial attribute
//begin script when window loads
window.onload = setMap();
//set up choropleth 
function setMap() {
    //map frame dimensions
    var width = window.innerWidth * 0.9,
        height = 900;
  //create svg container for the map
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);
  //create Albers equal area conic projection
  var projection = d3.geo.albers()
  //set a center/rotation to focus on WI
  .center([-0.00, 44.437778])
  .rotate([90.130186, 0, 0])
  .parallels([42, 46])
  //scale -- sizes the map
  .scale(8500)
  .translate([width / 2, height / 2]);
  //create a path generator
  var path = d3.geo.path()
  //pass it our projection generator as the parameter
    .projection(projection);
  //use queue.js to parallelize asynchronous data loading
  d3_queue.queue()
    .defer(d3.csv, "data/County_Classifications.csv") //load attributes from csv
    .defer(d3.json, "data/WI_Counties.topojson") //load choropleth spatial data
    //fires when all the data is loaded, sends all data to the callback function
    .await(callback);

function createDropdown(){
    //appends select element to the body
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown");

    //creates an <option> element with no value, affordance alerting users to interact with the dropdown
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });

        
};
//set up callback function with 3 parameters within setMap() so it can use variables above
  function callback(error, csvData, wi){
    //translate WI TopoJSON using the topojson.feature() method
    var wiCounties = topojson.feature(wi, wi.objects.WI_Counties).features;
    wiCounties = joinData(wiCounties, csvData);
    //add color scale
    var colorScale = makeColorScale(csvData);
    //add enumeration units to the map
    setEnumerationUnits(wiCounties, map, path, colorScale);
    //add coordinated viz to the map
    setChart(csvData, colorScale);
    createDropdown();
    };
};//end setMap()

function joinData(wiCounties, csvData) {
    //loop through csv to assign csv attribute values to the counties
    for (var i=0; i<csvData.length; i++){
        var csvCounty = csvData[i]; //the current county
        var csvKey = csvCounty.County; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a=0; a<wiCounties.length; a++){
            var geojsonProps = wiCounties[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME; //the geojson primary key
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvCounty[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return wiCounties;
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

//create a colorbrewer scale for the
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


//function to create coordinated bar chart
function setChart(csvData, colorScale){
    // sets min and max of the data (depending on what attribute is expressed)
    var minmax = [
        d3.min(csvData, function(d) {
            return parseFloat(d[expressed]); }),
        d3.max(csvData, function(d) {
            return parseFloat(d[expressed]); })
    ];
    //chart frame dimensions with padding (0 now but will adjust later)
    var chartWidth = window.innerWidth * 0.9,
        chartHeight = 500,
        leftPadding = 0,
        rightPadding = 0,
        topBottomPadding = 0,
        chartInnerWidth = chartWidth - leftPadding - rightPadding
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" +leftPadding + "," + topBottomPadding + ")";
//creates an svg element for the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //scale the bar sizes proportionally 
    var yScale = d3.scale.linear()
        .range([chartHeight - 30, 0])
        .domain(minmax);

    //set bars for each county
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
        return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.County;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 480 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

       //create a title for my chart
      var chartTitle = chart.append("text")
          .attr("x", 30)
          .attr("y", 150)
          .attr("class", "chartTitle")
          .text("Rurality of Counties in the " + expressed[1] + " Classification System");

    //creates vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    //places axis on the chart
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //keeping this code in case I decide to use numbers instead
    // var numbers = chart.selectAll(".numbers")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .sort(function(a, b){
    //         return a[expressed]-b[expressed]
    //     })
    //     .attr("class", function(d){
    //         return "numbers " + d.adm1_code;
    //     })
    //     .attr("text-anchor", "middle")
    //     .attr("x", function(d, i){
    //         var fraction = chartWidth / csvData.length;
    //         return i * fraction + (fraction - 1) / 2;
    //     })
    //     .attr("y", function(d){
    //         return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //     })
    //     .text(function(d){
    //         return d[expressed];
    //     });
    // //frame for chart 
    // var chartFrame = chart.append("rect")
    //     .attr("class", "chartFrame")
    //     .attr("width", chartInnerWidth)
    //     .attr("height", chartInnerHeight)
    //     .attr("transform", translate);

};

})(); //last line of main.js