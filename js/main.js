//wrap it all in an anonymous function
(function(){
//list attributes in an array for data join / for the dropdown
var attrArray = ["Rural-Urban Continuum Codes", "Urban-Rural Classification Scheme", "Urban Influence Codes", "Index of Relative Rurality", "National Center for Frontier Communities"];
//set up initial attribute
var expressed = attrArray[0];
// dimensions of the bar graph = a function of window width
var chartWidth = window.innerWidth * 0.4,
    chartHeight = 400,
    leftPadding = 35,
    rightPadding = 5,
    topBottomPadding = 10,
    chartInnerWidth = chartWidth - leftPadding - rightPadding
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//yScale for chart
var yScale = d3.scale.linear()
    .range([chartHeight - 20, 0])
    .domain([0, 10]);

//when window loads, call setMap()
window.onload = setMap();

//set up the choropleth
function setMap() {
    //width is a function of window size
    var width = window.innerWidth * 0.4,
        height = 800;

    //set up map variable, an svg element
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

//set the projection for WI
    var projection = d3.geo.albers()
        .scale(8000)
        .center([0.00, 44.437778])
        .rotate ([90.130186, 0, 0])
        .parallels([42, 46])
        .translate([width / 2, height / 2]);

        //
    var path = d3.geo.path()
        .projection(projection);

        //
    d3_queue.queue()
        .defer(d3.csv, "data/County_Classifications.csv")
        .defer(d3.json, "data/WI_Counties.topojson")
        .await(callback);

//set up callback function with 3 parameters within setMap() so it can use variables above
  function callback(error, csvData, wi){
    //translate WI TopoJSON using the topojson.feature() method
    var wiCounties = topojson.feature(wi, wi.objects.WI_Counties).features;
    wiCounties = joinData(wiCounties, csvData);

    //add color scale
    var colorScale = makeColorScale(csvData);
    //add enumeration units to the map
    setEnumerationUnits(wiCounties, map, path, colorScale);
    //add the chart to the map
    setChart(csvData, colorScale);
    //add the dropdown
    createDropdown(csvData);
    };
};//end of setMap

function joinData(wiCounties, csvData) {
    //loop through csv to assign attribute values to the counties
    for (var i=0; i<csvData.length; i++){
        //variable for the current county
        var csvCounty = csvData[i]; 
        //variable for the csv primary key
        var csvKey = csvCounty.NAME; 
        //loop through geojson regions to find correct region
        for (var a=0; a<wiCounties.length; a++){
            //the current county geojson properties
            var geojsonProps = wiCounties[a].properties;
            //the geojson primary key
            var geojsonKey = geojsonProps.NAME;
            //if primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    //get csv attribute value, take it in as a string and return as a float
                    var val = parseFloat(csvCounty[attr]);
                    //assign the attribute and its value to geojson properties
                    geojsonProps[attr] = val; 
                });
            };
        };
    };
    return wiCounties;
};

function setEnumerationUnits(wiCounties, map, path, colorScale) {
    var counties = map.selectAll(".counties")
        .data(wiCounties)
        .enter()
        .append("path")
        .attr("class", function(d) {
            return "counties " + d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    var desc = counties.append("desc")
        .text('{"stroke": "#000", "stroke-width": "2"}');

};


//create a colorbrewer scale for the
function makeColorScale(data){
    var colorClasses = [
        "#edf8e9",
        "#c7e9c0",
        "#a1d99b",
        "#41ab5d",
        "#238b45"
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
// creates coordinated bar chart
function setChart(csvData, colorScale) {

    // creates a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    // creates a rectangle to set a background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    // sets bars for each state
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.NAME;
        })

        .attr("width", chartInnerWidth / csvData.length - 1)

        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 460 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        })
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    //below Example 2.2 line 31...add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

    //creates a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 300)
        .attr("y", 30)
        .attr("class", "chartTitle")
        .attr("text-anchor", "middle")

    //creates vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    //places axis on the chart
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //creates a frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    updateChart(bars, csvData.length, colorScale);
};

function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Classification");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var counties = d3.selectAll(".counties")
        .transition()
        .duration(900)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d, i) {
            return i * 20
        })
        .duration(450);

    updateChart(bars, csvData.length, colorScale);
};

function updateChart(bars, n, colorScale) {
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        })

        var chartTitle = d3.select(".chartTitle")
        .text("Rurality in the " + expressed + " Classification System",'{"font-color": "white"}');
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.NAME)
        .style({
            "stroke": "white",
            "stroke-width": "3"
        });
    setLabel(props);
};

function dehighlight(props) {
    var selected = d3.selectAll("." + props.NAME)
        .style({
            "stroke": function(){
                return getStyle(this, "stroke")
            },
            "stroke-width": function(){
                return getStyle(this, "stroke-width")
            }
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

function setLabel(props) {
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr({
            "class": "infolabel",
            "id": props.NAME + "_label"
        })
        .html(labelAttribute);

    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
};

function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style({
            "left": x + "px",
            "top": y + "px"
        });


};

})(); //last line of main.js