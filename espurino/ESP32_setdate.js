const HTTP = require("http");
const WIFI = require("Wifi");
const SURLAPI = 'http://api.wunderground.com/api/'+APISTR+'/forecast/q/';

function setTimeWunder()
{
	//getting weather now, so allow another process to get weather
	setTime.val = "";
	var ZIP= '22182';
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   setTimeWunder.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			var oWeather = JSON.parse( setTimeWunder.val );
			setTimeWunder.val = "";
			setTimeWunder.obj = oWeather;
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
setTimeWunder.val = "";
setTimeWunder.obj = null;

function loadModule(moduleName, callback) {
  require("http").get("http://www.espruino.com/modules/"+moduleName+".js", function(res) {
    var contents = "";
    res.on('data', function(data) { contents += data; });
    res.on('close', function() { 
      Modules.addCached(moduleName, contents); 
      if (callback) callback();
    });
  }).on('error', function(e) {
    console.log("ERROR", e);
  });
}


function drawTime()
{
  graphics.clear();
  var sTime = dateString(new Date());
  graphics.drawString(sTime,2,2);  
  // write to the screen
  graphics.flip(); 
}

function initGraphics()
{
  graphics.on();
  graphics.clear();
  graphics.setFontVector(16);
  setInterval(drawTime, 60000);
}


function onInit()
{
  // I2C
  loadModule("SSD1306", main);
}

function main()
{
  console.log("main");
  var I2C1 = new I2C();
  I2C1.setup({scl:D22,sda:D21});
  graphics = require("SSD1306").connect(I2C1, initGraphics, { height : 64 });
}

/*
http://api.wunderground.com/api/13db05c35598dd93/forecast/q/22182.json
{
  "response": {
  "version": "0.1",
  "termsofService": "http://www.wunderground.com/weather/api/d/terms.html",
  "features": {
  "forecast": 1
  }
  },
  "forecast": {
  "txt_forecast": {
  "date": "2:00 PM PDT",
  "forecastday": [{
  "period": 0,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Tuesday",
  "fcttext": "Partly cloudy in the morning, then clear. High of 68F. Breezy. Winds from the West at 10 to 25 mph.",
  "fcttext_metric": "Partly cloudy in the morning, then clear. High of 20C. Windy. Winds from the West at 20 to 35 km/h.",
  "pop": "0"
  }, {
  "period": 1,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Tuesday Night",
  "fcttext": "Mostly cloudy. Fog overnight. Low of 50F. Winds from the WSW at 5 to 15 mph.",
  "fcttext_metric": "Mostly cloudy. Fog overnight. Low of 10C. Breezy. Winds from the WSW at 10 to 20 km/h.",
  "pop": "0"
  }, {
  "period": 2,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Wednesday",
  "fcttext": "Mostly cloudy. Fog early. High of 72F. Winds from the WSW at 10 to 15 mph.",
  "fcttext_metric": "Mostly cloudy. Fog early. High of 22C. Breezy. Winds from the WSW at 15 to 20 km/h.",
  "pop": "0"
  }, {
  "period": 3,
  "icon": "mostlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/mostlycloudy.gif",
  "title": "Wednesday Night",
  "fcttext": "Overcast. Fog overnight. Low of 54F. Winds from the WSW at 5 to 15 mph.",
  "fcttext_metric": "Overcast. Fog overnight. Low of 12C. Breezy. Winds from the WSW at 10 to 20 km/h.",
  "pop": "0"
  }, {
  "period": 4,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Thursday",
  "fcttext": "Overcast in the morning, then partly cloudy. Fog early. High of 72F. Winds from the WSW at 10 to 15 mph.",
  "fcttext_metric": "Overcast in the morning, then partly cloudy. Fog early. High of 22C. Breezy. Winds from the WSW at 15 to 25 km/h.",
  "pop": "0"
  }, {
  "period": 5,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Thursday Night",
  "fcttext": "Partly cloudy in the evening, then overcast. Fog overnight. Low of 54F. Winds from the WNW at 5 to 15 mph.",
  "fcttext_metric": "Partly cloudy in the evening, then overcast. Fog overnight. Low of 12C. Breezy. Winds from the WNW at 10 to 20 km/h.",
  "pop": "0"
  }, {
  "period": 6,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Friday",
  "fcttext": "Overcast in the morning, then partly cloudy. Fog early. High of 68F. Winds from the West at 5 to 15 mph.",
  "fcttext_metric": "Overcast in the morning, then partly cloudy. Fog early. High of 20C. Breezy. Winds from the West at 10 to 20 km/h.",
  "pop": "0"
  }, {
  "period": 7,
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "title": "Friday Night",
  "fcttext": "Mostly cloudy. Fog overnight. Low of 52F. Winds from the West at 5 to 10 mph.",
  "fcttext_metric": "Mostly cloudy. Fog overnight. Low of 11C. Winds from the West at 10 to 15 km/h.",
  "pop": "0"
  }]
  },
  "simpleforecast": {
  "forecastday": [{
  "date": {
  "epoch": "1340776800",
  "pretty": "11:00 PM PDT on June 26, 2012",
  "day": 26,
  "month": 6,
  "year": 2012,
  "yday": 177,
  "hour": 23,
  "min": "00",
  "sec": 0,
  "isdst": "1",
  "monthname": "June",
  "weekday_short": "Tue",
  "weekday": "Tuesday",
  "ampm": "PM",
  "tz_short": "PDT",
  "tz_long": "America/Los_Angeles"
  },
  "period": 1,
  "high": {
  "fahrenheit": "68",
  "celsius": "20"
  },
  "low": {
  "fahrenheit": "50",
  "celsius": "10"
  },
  "conditions": "Partly Cloudy",
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "skyicon": "mostlysunny",
  "pop": 0,
  "qpf_allday": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_day": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_night": {
  "in": 0.00,
  "mm": 0.0
  },
  "snow_allday": {
  "in": 0,
  "cm": 0
  },
  "snow_day": {
  "in": 0,
  "cm": 0
  },
  "snow_night": {
  "in": 0,
  "cm": 0
  },
  "maxwind": {
  "mph": 21,
  "kph": 34,
  "dir": "West",
  "degrees": 272
  },
  "avewind": {
  "mph": 17,
  "kph": 27,
  "dir": "West",
  "degrees": 272
  },
  "avehumidity": 72,
  "maxhumidity": 94,
  "minhumidity": 58
  }, {
  "date": {
  "epoch": "1340863200",
  "pretty": "11:00 PM PDT on June 27, 2012",
  "day": 27,
  "month": 6,
  "year": 2012,
  "yday": 178,
  "hour": 23,
  "min": "00",
  "sec": 0,
  "isdst": "1",
  "monthname": "June",
  "weekday_short": "Wed",
  "weekday": "Wednesday",
  "ampm": "PM",
  "tz_short": "PDT",
  "tz_long": "America/Los_Angeles"
  },
  "period": 2,
  "high": {
  "fahrenheit": "72",
  "celsius": "22"
  },
  "low": {
  "fahrenheit": "54",
  "celsius": "12"
  },
  "conditions": "Partly Cloudy",
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "skyicon": "mostlysunny",
  "pop": 0,
  "qpf_allday": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_day": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_night": {
  "in": 0.00,
  "mm": 0.0
  },
  "snow_allday": {
  "in": 0,
  "cm": 0
  },
  "snow_day": {
  "in": 0,
  "cm": 0
  },
  "snow_night": {
  "in": 0,
  "cm": 0
  },
  "maxwind": {
  "mph": 11,
  "kph": 18,
  "dir": "WSW",
  "degrees": 255
  },
  "avewind": {
  "mph": 9,
  "kph": 14,
  "dir": "WSW",
  "degrees": 252
  },
  "avehumidity": 70,
  "maxhumidity": 84,
  "minhumidity": 54
  }, {
  "date": {
  "epoch": "1340949600",
  "pretty": "11:00 PM PDT on June 28, 2012",
  "day": 28,
  "month": 6,
  "year": 2012,
  "yday": 179,
  "hour": 23,
  "min": "00",
  "sec": 0,
  "isdst": "1",
  "monthname": "June",
  "weekday_short": "Thu",
  "weekday": "Thursday",
  "ampm": "PM",
  "tz_short": "PDT",
  "tz_long": "America/Los_Angeles"
  },
  "period": 3,
  "high": {
  "fahrenheit": "72",
  "celsius": "22"
  },
  "low": {
  "fahrenheit": "54",
  "celsius": "12"
  },
  "conditions": "Partly Cloudy",
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "skyicon": "partlycloudy",
  "pop": 0,
  "qpf_allday": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_day": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_night": {
  "in": 0.00,
  "mm": 0.0
  },
  "snow_allday": {
  "in": 0,
  "cm": 0
  },
  "snow_day": {
  "in": 0,
  "cm": 0
  },
  "snow_night": {
  "in": 0,
  "cm": 0
  },
  "maxwind": {
  "mph": 14,
  "kph": 22,
  "dir": "West",
  "degrees": 265
  },
  "avewind": {
  "mph": 12,
  "kph": 19,
  "dir": "WSW",
  "degrees": 256
  },
  "avehumidity": 80,
  "maxhumidity": 91,
  "minhumidity": 56
  }, {
  "date": {
  "epoch": "1341036000",
  "pretty": "11:00 PM PDT on June 29, 2012",
  "day": 29,
  "month": 6,
  "year": 2012,
  "yday": 180,
  "hour": 23,
  "min": "00",
  "sec": 0,
  "isdst": "1",
  "monthname": "June",
  "weekday_short": "Fri",
  "weekday": "Friday",
  "ampm": "PM",
  "tz_short": "PDT",
  "tz_long": "America/Los_Angeles"
  },
  "period": 4,
  "high": {
  "fahrenheit": "68",
  "celsius": "20"
  },
  "low": {
  "fahrenheit": "52",
  "celsius": "11"
  },
  "conditions": "Fog",
  "icon": "partlycloudy",
  "icon_url": "http://icons-ak.wxug.com/i/c/k/partlycloudy.gif",
  "skyicon": "mostlysunny",
  "pop": 0,
  "qpf_allday": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_day": {
  "in": 0.00,
  "mm": 0.0
  },
  "qpf_night": {
  "in": 0.00,
  "mm": 0.0
  },
  "snow_allday": {
  "in": 0,
  "cm": 0
  },
  "snow_day": {
  "in": 0,
  "cm": 0
  },
  "snow_night": {
  "in": 0,
  "cm": 0
  },
  "maxwind": {
  "mph": 11,
  "kph": 18,
  "dir": "West",
  "degrees": 267
  },
  "avewind": {
  "mph": 10,
  "kph": 16,
  "dir": "West",
  "degrees": 272
  },
  "avehumidity": 79,
  "maxhumidity": 93,
  "minhumidity": 63
  }]
  }
  }
}
*/


function setTime()
{
	//getting weather now, so allow another process to get weather
	setTime.val = "";
	var ZIP= '22182';
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   getWeather.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			var oWeather = JSON.parse( getWeather.val );
			getWeather.val = "";
			setTime.obj = oWeather;
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
setTime.val = "";
setTime.obj = null;

function fixMinutes(nMins)
{
	var sMins = '00';
	if(nMins)
	{
		if(nMins < 10)
		{
			sMins = '0' + nMins;
		}
		else
		{
			sMins = nMins;
		}
	}
	return sMins;
}

function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}
onInit();