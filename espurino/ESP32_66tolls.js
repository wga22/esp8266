const HTTP = require("http");
const WIFI = require("Wifi");
const SURLAPI = 'http://shoulditakei66.today/';
var graphics=null;
const ROWHEIGHT = 16;

function drawLCD()
{
	graphics.clear();

	var aVals = [];
	aVals.push(dateString(new Date()));
	aVals.push(loadTolls.output);

	for (var x=0; x < aVals.length; x++)
	{
		graphics.drawString(aVals[x],2,(2+(x*ROWHEIGHT)));  
	}
	// write to the screen
	graphics.flip();
	loadTolls();
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
  setTimeout(main, 10000);
  //cannot run this without delay loadModule("SSD1306", main);
}

function main()
{
  console.log("main");
  loadTime();
  var I2C1 = new I2C();
  I2C1.setup({scl:D22,sda:D21});
  graphics = require("SSD1306").connect(I2C1, initGraphics, { height : 64 });
}

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

//populate the weather variable with the sunset, etc
function loadTime()
{
	const timeurl = "http://worldclockapi.com/api/json/est/now";
	loadTime.val = "";
	HTTP.get((timeurl), function(res) 
	{
		res.on('data', function(wunderString) {   loadTime.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			var oWeather = JSON.parse( loadTime.val );
			loadTime.val = "";
			var sTimeStr = oWeather.currentDateTime;
			console.log(sTimeStr);
			setTime((new Date(sTimeStr).getTime()/1000));
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
loadTime.val = "";

function loadTolls()
{
	//getting weather now, so allow another process to get weather
	HTTP.get((SURLAPI), function(res) 
	{
		res.on('data', function(wunderString) {   loadTolls.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			var bw2WashDiv = loadTolls.val.indexOf('59');
			console.log("Connection to tolls closed len:" + loadTolls.val.length + " toll loc:" + bw2WashDiv);
			console.log(loadTolls.val);
			if(bw2WashDiv > 20)
			{
				var sDivStr = loadTolls.val.slice(bw2WashDiv, bw2WashDiv+30);	//<h1 data-reactid="59">$0.00</h1>
				var nStart = sDivStr.indexOf(">");
				var nStop = sDivStr.indexOf("<");
				if(nStart > 0 && nStop>nStart)
				{
					loadTolls.output = sDivStr.slice(nStart+1, nStop);
				}
				else
				{
					console.log("issue getting output string " + nStart + " " + nStop);
					loadTolls.output = "issue getting output string " + nStart + " " + nStop;	
				}
			}
			else
			{
				loadTolls.output = "ERR42 \n toll not found ("+loadTolls.val.length+")";
			}
			loadTolls.val = "";
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
loadTolls.val = "";
loadTolls.obj = null;
loadTolls.output = "initialize";

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
	return aMonths[a_dDate.getMonth()-1] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
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

//populate the weather variable with the sunset, etc
function loadTime()
{
	const timeurl = "http://worldclockapi.com/api/json/est/now";
	loadTime.val = "";
	HTTP.get((timeurl), function(res) 
	{
		res.on('data', function(wunderString) {   loadTime.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			var oWeather = JSON.parse( loadTime.val );
			loadTime.val = "";
			var sTimeStr = oWeather.currentDateTime;
			console.log(sTimeStr);
			setTime((new Date(sTimeStr).getTime()));
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
loadTime.val = "";

onInit();