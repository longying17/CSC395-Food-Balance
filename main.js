// Data to match map ids with country names
 d3.tsv("world-country-names.tsv", function(country_names) {
  /*  ----------------------
      ---------MAP---------
      ---------------------- */
  // Map code taken from datavis-interactive lab http://www.cs.grinnell.edu/~curtsinger/teaching/2017S/CSC395/labs/13.interactive.html

  // Set up the SVG
  var svg_width = window.innerWidth - 300;
  var svg_height = window.innerHeight - 40;

  // Use d3's built in projection object 
  var projection = d3.geoEquirectangular();
  var path = d3.geoPath().projection(projection);

  // Generate an SVG element on the page
  var svg = d3.select("body").append("svg")
      .attr("width", svg_width)
      .attr("height", svg_height)
      .style("display", "block")
      .style("margin", "auto");

  // Render world map 
  d3.json('world-110m.json', function(error, world) {
    // Decode the topojson file
    var land = topojson.feature(world, world.objects.land);
    var countries = topojson.feature(world, world.objects.countries).features;
    var neighbors = topojson.neighbors(world.objects.countries.geometries);
    // Fit our projection so it fills the window
    projection.fitSize([svg_width, svg_height], land);

    // Loop over countries to match map ids with names 
        for (country of countries)
        {
          country.name = find_name(country.id, country_names);
        }

// Function to update map when new year is selected
var changeDataset = function(year) {

	//Use dropdown menu to create file path
	var fileName = "FAOdata/"
	fileName += year;

  // Pull in FAO data 
  d3.csv(fileName, function(year_data) {

    /*  ----------------------
        ---------DATA---------
        ---------------------- */

      // Use crossfilter for FAO data
      var amounts = crossfilter(year_data);
      // Make a dimension with the Country field, group by Element and Country
      var countryDim = amounts.dimension(function (d) { 
                                          var thisElement = d.Element;
                                          return 'Element='+thisElement+';Country='+d.Country; } );


     // Sum all production and supply values for each country
      var ElementCountry = (countryDim.group().reduceSum(function(d) 
          {
            if (d.Element == "Domestic supply quantity")  
              { 
                return d.Value}
            else 
              { 
                return d.Value}
          } ).all());

      // Score each country with the formula (prodcution/domestic supply)*100
      var num_countries = countryDim.group().size()/2;
      var formulaResult = [];
      for(i=0; i<num_countries; i++) {
        var currentDict = {};
        // Change key to be country name
        currentDict.key = ElementCountry[i].key.replace("Element=Domestic supply quantity;Country=", "");
        // Calculate sufficiency score
        currentDict.value = ElementCountry[i+num_countries].value*100/ElementCountry[i].value;
        formulaResult.push(currentDict);
      }

    // Loop over countries to match map names with sufficiency scores
          for (country of countries)
          {
            current_suff = find_suff(country.name, formulaResult)
            if (current_suff)
              country.suff = current_suff;
            else 
              country.suff = 0;
          }

  // Scale color set based on max and min sufficiency scores
        var noZeroesSuff = countries.filter(function(d) { return d.suff !== 0; });
        var minSuff = d3.min(noZeroesSuff, function (d) { return d.suff });
        var maxSuff = d3.max(countries, function (d) { return d.suff });

  // Define color function
  var color = d3.scalePow(1.2)
                      .domain([minSuff, maxSuff])
                      .interpolate(d3.interpolateHcl)
                      .range(["rgb(236, 255, 179)", "rgb(0, 51, 153)"]);
   
    // Show max and min sufficiency scores for year
    var suffText = getSuffText(minSuff, maxSuff, year);
    var maxSuffLabel = document.getElementById("max");
    max.innerHTML = suffText[0];
    var minSuffLabel = document.getElementById("min");
    min.innerHTML = suffText[1];
    document.getElementById("maxColor")
      .style.backgroundColor = color(maxSuff);
      document.getElementById("minColor")
      .style.backgroundColor = color(minSuff);

        // Helper function: Update view function if a country is clicked
        var updateView = function (countries, neighbors, selectedCountry) {
          if (selectedCountry == null) {
            document.getElementById("header").innerHTML = "Food Self-Sufficiency Worldwide (" + year.split(".")[0] + ")";
            svg.selectAll('.country')
               .data(countries)
               .attr('class', 'country')
               .attr('d', path)
               .style('fill', function(d, i) { if (d.suff == 0) return 'd3d3d3'
                                        else return color(d.color = d.suff); })
               .style('opacity', 1.0)
               .style('stroke', '#fff')
               .on("mouseover", function () {
                  this.parentNode.appendChild(this);
                  d3.select(this)
                    .style('stroke', '#000');
               })
               .on("mouseout", function() {
                  d3.select(this)
                    .style('stroke', '#fff');
               })
               .on("click", function(d) {
                  updateView(countries, neighbors, d);
               });
            document.getElementById("legend")
                    .innerHTML = ("");
            document.getElementById("legend")
                    .style.border = "0px";  
          } 
          else {
            document.getElementById("header").innerHTML = "Food Self-Sufficiency in " + selectedCountry.name + " (" + year.split(".")[0] + ")";
            svg.selectAll('.country')
               .data(countries)
               .attr('class', 'country')
               .attr('d', path)
               .style('stroke', '#fff')
               .style('opacity', function(d) { if (d.id != selectedCountry.id)
                  return 0.5;
               })
               .on("mouseover", function () {})
               .on("mouseout", function () {})
               .on("click", function(d) {
                  updateView(countries, neighbors, null);
               });
            var legendText = getLegendText(selectedCountry, year_data, year);
            document.getElementById("legend")
                    .append(legendText);
            document.getElementById("legend")
                    .style.border = "solid #000000";      
          }
        };

        //Fill in countries by distinct colors
        svg.selectAll('.country')
           .data(countries)
           .enter()
           .append('path')
           .attr('class', 'country')
           .attr('d', path);

        updateView(countries, neighbors, null);
      }); // end d3.csv
    }
    
    //Initially render map with 2013 data by default
    changeDataset("2013.csv");

    //Create event listener to change dataset when different year is selected
    d3.select('#opts')
      .on('change', function() {
      	var newYear = d3.select(this).property('value');
      	changeDataset(newYear);
    });
  });// end d3.json
}); // end d3.tsv

/*  ----------------------
    ---HELPER FUNCTIONS---
    ---------------------- */

// Helper function to find id in country_names
function find_name (id, country_names) {
for (entry of country_names) 
  {
    if (entry.id == id)
      return entry.name;
  }
};

// Helper function to find sufficiency given country name
function find_suff (name, formulaResult) {
    for (suff of formulaResult) 
    {
      if (name == suff.key)
        return suff.value;
    }
};

// Helper function to find id in FAO data
function find_legend_data(name, data)
{
  var results = [];
  for (entry of data)
  {
    if (entry.Country == name && entry.Element == "Production")
      results.push(entry);
  }
  for (r of results)
  results = results.sort(function(a,b) {
    if (parseInt(a.Value) <= parseInt(b.Value))
      return 1
    else return -1});
  for (r of results)
  return results;
}

// Helper function to generate legend text
function getLegendText(country, data, year) {
  if (country.suff == 0)
    var str = "No data for " + country.name + " in " + year.split(".")[0] + ".";
  else {
    var str = "Name: " + (country.name);
    str += "\nSufficiency score: " ;
    str += parseFloat(country.suff).toFixed(2);
    str += "\nTop 10 produced items (in 1000 tonnes):" ;
    var data = find_legend_data(country.name, data)

    for (i=0; i<10; i++)
    {
      if (data[i])
      {
        str += ("\n" + data[i].Item + " " + data[i].Value);
      }
    }
  }
  return str;
};

// Helper function to generate sufficiency key text
function getSuffText(minSuff, maxSuff, year) {
  var maxStr = "Maximum sufficiency score in " + (year.split(".")[0]) + ": " +  parseFloat(maxSuff).toFixed(2) + ".";
  var minStr = "Minimum sufficiency score in " + (year.split(".")[0]) + ": " +  parseFloat(minSuff).toFixed(2) + ".";
  var arr = [];
  arr.push(maxStr);
  arr.push(minStr)
  return arr;
};