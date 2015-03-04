var TaxiTracker = {
  g: null,
  data: null,
  map: null,
  dataLoaded: null,
  d3path: null, //used in initSVG
  transform: null, //used in initSVG
  time: moment(),
  timeFactor: 2, //number of minutes in real life to a second in the viz
  timerStarted: false,
  timer: null,
  MAP_ROOT: 'https://{s}.tiles.mapbox.com/v4/yuraginza.l13km23a', // http://{s}.tiles.mapbox.com/v4/zwadia.k5hj7olb',
  TOKEN: 'pk.eyJ1IjoieXVyYWdpbnphIiwiYSI6Ii1YdFMtdVEifQ.aGY0OEna4kTYaDLrQf742A',
  svg: null,
  QF: 'HHmm', // query format
  TQ: {
    startDate: null,
    endDate: null,
    currentStart: null,
    currentTime: null
  },
  tweenToggle: 0,
  pointsArray: [],
  animatedKeyList: [],
  initMap: function() {
    $('.timeFactor').html(TaxiTracker.timeFactor); //Displays the timeFactor in the UI.
    var mapboxTiles = L.tileLayer(TaxiTracker.MAP_ROOT + '/{z}/{x}/{y}.png?access_token=' + TaxiTracker.TOKEN, {
      attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
      maxZoom: 18,
    });
    TaxiTracker.map = L.map('map', {
      zoomControl: false
    }).addLayer(mapboxTiles).setView([40.79424, -73.97023], 14);
    /*Add an SVG element to Leaflet’s overlay pane.*/
    TaxiTracker.svg = d3.select(TaxiTracker.map.getPanes().overlayPane).append("svg");
    TaxiTracker.g = TaxiTracker.svg.append("g").attr({
      "id": "taxi",
      "class": "leaflet-zoom-hide",
    });
  },
  initSVG: function() {
    /* create a d3.geo.path to convert GeoJSON to SVG. We use The function d3.geo.path() to convert GeoJSON to path codes and use “stream transform” combined with a function (projectPoint) that makes use of a Leaflet function (latLngToLayerPoint) as projection function. These pieces are used here to create (and project) the line between our points and the bounding box coordinates.*/
    TaxiTracker.transform = d3.geo.transform({
      point: projectPoint
    });
    TaxiTracker.d3path = d3.geo.path().projection(TaxiTracker.transform);
  },
  getData: function() {
    //TaxiTracker.dataLoaded = d3.json('/trip', function(data) { // We can use asynchronous d3.json() or $.getJSON to read in our data. 
    TaxiTracker.dataLoaded = d3.json('taxitracker.json', function(data) { // We can use asynchronous d3.json() or $.getJSON to read in our data. 
      console.log("[getData] Load json, init SVG and call RenderJSONData")
      TaxiTracker.initSVG(); //Set up conversion and projection functions
      TaxiTracker.renderJSONData(data);
    });
  },
  renderJSONData: function(data) {
    var counter = 0; // To generate unique Path ID
    TaxiTracker.data = data; //Reset function will use this JSON data to calc boundary
    // create path elements for each of the features
    TaxiTracker.g.selectAll("path").data(data.features).enter().append("path").attr("id", function(d) {
      return "path" + counter++; //We assign unique path ID
    }).attr("class", function(d) {
      var key = moment(d.properties.pickuptime.toString(), "MM/DD/YY h:mm").format(TaxiTracker.QF); //HHMM as animated keyframe
      TaxiTracker.animatedKeyList.push(key) //Add into list of keymarkers
      if (d.properties.hasfare == true) {
        return "trip" + (d.properties.key * 2) + " " + d.properties.hasfare + " anikey" + key;
      } else {
        return "trip" + ((d.properties.key * 2) + 1) + " " + d.properties.hasfare + " anikey" + key;
      }
    }).attr("style", "opacity:0.05"); //Peek at loaded path for debugging (should be 0)
    TaxiTracker.map.on("viewreset", TaxiTracker.reset);
    TaxiTracker.reset();
    console.log("[RenderJSONData] List of Keymarkers: " + TaxiTracker.animatedKeyList)
  },
  //Called once to start iteration function
  processResponse: function(response) {
    console.log("[processResponse]");
    TaxiTracker.time = moment(TaxiTracker.TQ.currentStart.toString(), "MM/DD/YY h:mm"); //Set Initial Time based on HIDDEN FORM
    console.log("[processResponse] Set Init Start Time: " + TaxiTracker.time.format(TaxiTracker.QF))
    TaxiTracker.TQ.currentTime = TaxiTracker.time.format(TaxiTracker.QF); //Set Current Time == Start Time
    //Start Timer    
    if (!TaxiTracker.timerStarted) {
      console.log("[processResponse] Start Timer");
      TaxiTracker.updateTimer();
      TaxiTracker.timerStarted = true;
    }
  },
  //Recursive until it is cleared
  updateTimer: function() {
    /* TRIGGER Timebased animation. Check current time, if it's in the list of animated key, then issue animate command.*/
    var curTime = TaxiTracker.time.format(TaxiTracker.QF)
    if ($.inArray(curTime, TaxiTracker.animatedKeyList) !== -1) { //If it's in keyframe array, remove it then play
      TaxiTracker.animatedKeyList = $.grep(TaxiTracker.animatedKeyList, function(value) {
        return value != curTime; //Delete Key Marker
      });
      console.log("[updateTimer] animatedKeyList: " + TaxiTracker.animatedKeyList);
      console.log("[updateTimer] trigger animation on " + curTime)
      TaxiTracker.animate(curTime); //TIME-BASED ANIMATION
    }
    TaxiTracker.time.add('minutes', 1); //Increate timer by 1 mins
    TaxiTracker.TQ.currentTime = TaxiTracker.time.format(TaxiTracker.QF); //Update Current Time
    //Update Date/Time Display
    $('.readableTime').text(TaxiTracker.time.format('h:mm a'));
    $('.date').text(TaxiTracker.time.format('dddd, MMMM Do YYYY'));
    //Timer function: executes a function, once, after waiting a specified number of milliseconds
    TaxiTracker.timer = setTimeout(function() {
      TaxiTracker.updateTimer()
    }, (1000 / TaxiTracker.timeFactor));
  },
  animate: function(key) {
    console.log("[animate] " + key + " on " + TaxiTracker.TQ.currentTime);
    //Called by Timer, we select all relevant path then apply transition function
    TaxiTracker.svg.selectAll("path.anikey" + key).each(TaxiTracker.animatetransition)
  },
  //Called by iterate function - when finich, call the next iterate function or clear time out
  animatetransition: function(d) {
    var currentpath = d3.select(this); //for each transitioning path - this is unlike iterate function
    var pathid = currentpath.attr('id') //get the path id
    var markerpathid = "marker-" + pathid; //set marker name id. Perhaps need to do the same for start and endpoint
    var endmarkerpathid = "endmarker-" + pathid; //ser end marker name id
    var startmarkerpathid = "startmarker-" + pathid; //ser end marker name id
    console.log("[animatetransition] selected pathid:" + pathid + " - pickuptime:" + d.properties.pickuptime)
    var l = this.getTotalLength(),
      currentPathStartPoint = this.getPointAtLength(0),
      currentPathEndPoint = this.getPointAtLength(l),
      currentPathStartPointLatLon = xycoordToLatLon(currentPathStartPoint.x, currentPathStartPoint.y),
      currentPathEndPointLatLon = xycoordToLatLon(currentPathEndPoint.x, currentPathEndPoint.y);
    //ADD START MARKER POINT
    TaxiTracker.pointsArray.push([d.properties.hasfare]); //Add Data 
    var hasfare= d.properties.hasfare; 
    var startmarker = TaxiTracker.g.append('circle').attr({
      r: 8
    }).data(TaxiTracker.pointsArray).attr("id", function(d) {
      return startmarkerpathid; // Associate Marker to Path
    }).attr("class", function(d,i) {
      console.log("[animatetransition] startmarker id:" + startmarkerpathid + "- class d[hasfare]: " + hasfare)
      if (hasfare) { // Start Marker Class with HasFare property
        return "startPoint point hasfare";
      } else {
        return "startPoint point nofare";
      }
    }).attr("transform", function(d) {
      return translateLatLngPoint(currentPathStartPointLatLon.lat, currentPathStartPointLatLon.lng); // Translate to End Point
    }).datum(currentPathStartPointLatLon); //.transition().duration(2000).style('opacity', 0).remove();
    //ADD CURRENT MARKER POINT   
    var currentmarker = TaxiTracker.g.append('circle').attr({
      r: 2
    }).attr("class", "markerPoint point").attr("id", function(d) {
      return "marker-" + pathid; // Associate Marker to Path
    }).attr("transform", function(d) {
      return translateLatLngPoint(currentPathStartPointLatLon.lat, currentPathStartPointLatLon.lng); // Translate to End Point
    });

    if (d.properties.hasfare) { //transition marker to show full taxi
      currentmarker
        .transition()
        .duration(500)
        .attr("r", 5)
        .attr('style', 'opacity:1');
    } else { //Transition marker to show empty taxi
      currentmarker
        .transition()
        .duration(500)
        .attr("r", 40)
        .attr('style', 'opacity:.3');
    }

    //ASSIGN ANIMATION TRANSITION AND DURATION TO THE SELECTED PATH
    currentpath.transition().duration(function(d) {
      var start = Date.parse(d.properties.pickuptime),
        finish = Date.parse(d.properties.dropofftime),
        duration = finish - start;
      duration = duration / 60000; //convert to minutes
      duration = duration * (1 / TaxiTracker.timeFactor) * 1000;
      return (duration);
    }).each('start', function(d) {
      console.log("[animatetransition] start: " + pathid + " pickup: " + d.properties.pickuptime) //d3.select(this)  
      this.style.opacity = 1;
    }).each("end", function(d, i) {

      //WE NEED TO CHANGE THIS TO CHECK IF ANIMATION ARRAY IS EMPTY THEN STOP TIMER
      console.log("[animatetransition] end: " + pathid + " pickup: " + d.properties.pickuptime + " counter i:" + i) //d3.select(this)
        //this.style.opacity = 0; //remove stroke
      currentpath.attr('stroke-dasharray', "");
      //ADD END MAKER UPON PATH TRANSITION END
      var endmarker = TaxiTracker.g.append('circle').attr({
        r: 8
      }).data(TaxiTracker.pointsArray).attr("id", function(d) {
        return endmarkerpathid; // Associate Marker to Path
      }).attr("class", "endPoint point").attr("transform", function(d) {
        return translateLatLngPoint(currentPathEndPointLatLon.lat, currentPathEndPointLatLon.lng); // Translate to End Point
      }).datum(currentPathEndPointLatLon); //.transition().duration(2000).style('opacity', 0).remove();

      console.log("[animatetransition] Remove current marker:" + markerpathid)
        //Remove Current Animation Marker upon completion of Path Animation
      TaxiTracker.g.select("#" + markerpathid).transition().duration(2000).style('opacity', 0).remove();
      if (TaxiTracker.animatedKeyList.length === 0) { //Bug was called TWICE - need to figure out call only after the longest end duration completed
        //NOTHING TO ANIMATE, Clear Timers
        console.log("[animatetransition] Empty animated Key List Array: Clear Time out for " + TaxiTracker.timer)
        clearTimeout(TaxiTracker.timer);
      } else {
        // CALL next iteration or Just wait until next timer to animate
      }
    }).attrTween('stroke-dasharray', TaxiTracker.tweenDash);
  },
  tweenDash: function(d) {
    var path = d3.select(this); //IMPORTANT Reference : THIS IS HOW TO SELECT D3 Object in SELECTALL
    var pathid = path.attr('id')
    var markerpathid = "marker-" + pathid;
    return function(t) {
      var l = path.node().getTotalLength();
      var interpolate = d3.interpolateString("0," + l, l + "," + l); // interpolation of stroke-dasharray style attr
      var p = path.node().getPointAtLength(t * l);
      var pos = xycoordToLatLon(p.x, p.y) //same as above - updated to be consistent

      //Pan function
      if (TaxiTracker.tweenToggle == 0) {
        TaxiTracker.tweenToggle = 1;
        var newCenter = TaxiTracker.map.layerPointToLatLng(new L.Point(p.x, p.y));

        TaxiTracker.map.panTo(newCenter, 14);
      } else {
        TaxiTracker.tweenToggle = 0;
      }

      //move current marker according to time
      TaxiTracker.g.select("#" + markerpathid).datum(pos).attr("transform", function(d) {
        return translateLatLngPoint(d.lat, d.lng);
      });
      return interpolate(t);
    }
  },
  /*We reset SVG elements position when the user repositions the map and translate all points using translateLatLngPoint function and add 100 px to the width and height so that our circles markers do not get cut off*/
  reset: function() {
    console.log("[reset]");
    var bounds = TaxiTracker.d3path.bounds(TaxiTracker.data); //get the boundary box of loaded JSON data
    var topLeft = bounds[0];
    var bottomRight = bounds[1];
    TaxiTracker.svg.attr("width", bottomRight[0] - topLeft[0] + 100).attr("height", bottomRight[1] - topLeft[1] + 100).style("left", topLeft[0] - 50 + "px").style("top", topLeft[1] - 50 + "px");
    TaxiTracker.g.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")"); //We translate the group
    TaxiTracker.g.selectAll("path").attr("d", TaxiTracker.d3path); //Reposition path attribute
    TaxiTracker.g.selectAll(".point").attr("transform", function(d) { //Reposition all marker start and end points
      return translateLatLngPoint(d.lat, d.lng); //this is set by datum
    });
  }
};
// Document ready {{{
$(document).ready(function() {
  TaxiTracker.initMap();
  console.log("[DocReady] InitMap - Start Date: " + $('#startDate').val() + ' (as per hidden form)')
    //First, we configure start date and time for the animation. 
  TaxiTracker.TQ.startDate = $('#startDate').val() + ' 06:00';
  TaxiTracker.TQ.endDate = $('#endDate').val() + ' 08:00'; //not being used?
  TaxiTracker.TQ.currentStart = TaxiTracker.TQ.startDate; //Set Starting point for animation keymarker
  //Then we load the data when the page is loaded.
  TaxiTracker.getData();
  $('#begin').click(function() {
    $('.overlay').hide();
    $('.box').show();
    $('.newBox').hide();
    $('.totalsBox').hide();
    $('.areaChartBox').hide();
    //We should start timer and animation only when data has been loaded and user click begin button.
    $.when(TaxiTracker.dataLoaded).then(TaxiTracker.processResponse);
  });
  //Reduce time factor
  $('.slower').click(function() {
    if (TaxiTracker.timeFactor > 1) {
      TaxiTracker.timeFactor -= 1;
    };
    $('.timeFactor').html(TaxiTracker.timeFactor);
  });
  //Increase time factor
  $('.faster').click(function() {
    TaxiTracker.timeFactor += 1;
    $('.timeFactor').html(TaxiTracker.timeFactor);
  });
});
// End document ready }}}
// Utility functions {{{
function projectPoint(x, y) {
  var point = TaxiTracker.map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}

function translateLatLngPoint(lat, lng) {
  var point = TaxiTracker.map.latLngToLayerPoint(new L.LatLng(lat, lng));
  return "translate(" + point.x + "," + point.y + ")";
}

function xycoordToLatLon(x, y) {
    var point = TaxiTracker.map.layerPointToLatLng(new L.Point(x, y));
    return point; // this will give d.lat and d.lng
  }
  // End utility functions }}}