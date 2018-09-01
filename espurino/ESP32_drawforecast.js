const HTTP = require("http");
const WIFI = require("Wifi");
const MINUTE = 600000;
const FOURHOURS = MINUTE*60*4;
const SURLAPI = 'http://api.wunderground.com/api/'+WUNDERAPI+'/forecast/q/';
var graphics=null;
var aForecasts = [];
var nLooper = 0;

function loadForecast()
{
	//getting weather now, so allow another process to get weather
	setTime.val = "";
	var ZIP= '22182';
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   drawForecast.val += wunderString.replace("\t", " ");   });
		res.on('close', function(fLoaded) 
		{
			drawForecast.obj = JSON.parse( drawForecast.val );
			console.log("Connection to wunder closed:" + drawForecast.val.length);
			drawForecast.val = "";
			for(var x=0; x < 3; x++)
			{
				var oWeatherObj = drawForecast.obj.forecast.txt_forecast.forecastday[x];
				console.log(oWeatherObj);
				var sTitle = fixDayTitle(oWeatherObj.title);
				aForecasts[x] = { title: fixDayTitle, value:oWeatherObj.fcttext};
				console.log("title " + x + " : " +fixDayTitle );
			}
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
drawForecast.val = "";
drawForecast.obj = null;

function fixDayTitle(sTitle)
{
	return sTitle.replace("day", "").replace("Night", "nt");
}

function drawForecast()
{
	graphics.clear();
	if(aForecasts.length)
	{
		graphics.setFontVector(16);
		var nLen = 15;
		var nRows =aForecasts.length;
		var nRowHeight = 21;	//64/3
		var nPosition = 0;
		sString = aForecasts[nLooper].title + " : " + aForecasts[nLooper].value;
		console.log("have weather:" + sString);
		for(var x=0; x < nRows; x++)
		{
			var s1 = sString.substr(nPosition,nLen);
			var nLastSpace = s1.lastIndexOf(" ");
			nLastSpace = nLastSpace > 10 ? nLastSpace : nLen;
			s1 = sString.substring(nPosition, (nPosition+nLastSpace)).trim();
			nPosition =nPosition+nLastSpace;
			graphics.drawString(s1, 2,(2+(nRowHeight*x)));
			console.log(s1);
			nLooper++;
			if(nLooper>aForecasts.length)
			{
				nLooper=0;
			}
		}
	}
	else
	{
		console.log("waiting to get weather");
		graphics.setFontVector(14);
		graphics.drawString("Please wait,\n loading weather", 2,2);
	}
		
	// write to the screen
	graphics.flip(); 
}

function drawForecast2()
{
	//getting weather now, so allow another process to get weather
	setTime.val = "";
	var ZIP= '22182';
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   drawForecast.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			drawForecast.obj = JSON.parse( drawForecast.val );
			drawForecast.val = "";
			writeStringToLCD(drawForecast.obj.forecast.txt_forecast.forecastday[0].fcttext);
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
drawForecast2.val = "";
drawForecast2.obj = null;

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


function initGraphics()
{
  console.log("initGraphics");
  graphics.on();
  graphics.clear();
  //graphics.setFontVector(16);
  loadForecast();
  drawForecast();
  setInterval(loadForecast, FOURHOURS);
  setInterval(drawForecast, MINUTE);
}

function onInit()
{
  console.log("main");
  var I2C1 = new I2C();
  I2C1.setup({scl:D22,sda:D21});
  graphics = require("SSD1306").connect(I2C1, initGraphics, { height : 64 });
}
onInit();
//E.on('init',onInit);