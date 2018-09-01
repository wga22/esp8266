const HTTP = require("http");
const WIFI = require("Wifi");
const FOURHOURS = 3600*1000*4;
const SURLAPI = 'http://api.wunderground.com/api/'+WUNDERAPI+'/forecast/q/';
var lcd=null;
var graphics=null;
const ROWHEIGHT = 16;

function getTimeStr()
{
	return dateString(new Date());
}

function drawLCD()
{
	graphics.clear();

	var aVals = [];
	aVals.push(getTimeStr());
	aVals.push(loadForecast.output);

	for (var x=0; x < aVals.length; x++)
	{
		graphics.drawString(aVals[x],2,(2+(x*ROWHEIGHT)));  
	}
	// write to the screen
	graphics.flip(); 
	loadForecast();
}

function initGraphics()
{
  graphics.on();
  graphics.clear();
  graphics.setFontVector(16);
  drawLCD();
  setInterval(drawLCD, 60000);
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

onInit();



function loadForecast()
{
	//getting weather now, so allow another process to get weather
	setTime.val = "";
	var ZIP= '22182';
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   loadForecast.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			loadForecast.obj = JSON.parse( loadForecast.val );
			loadForecast.val = "";
			//writeStringToLCD(drawForecast.obj.forecast.txt_forecast.forecastday[0].fcttext);
			loadForecast.output = loadForecast.obj.forecast.txt_forecast.forecastday[0].fcttext;
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
loadForecast.val = "";
loadForecast.obj = null;
loadForecast.output = "initialize";

//LIBRARIES
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
