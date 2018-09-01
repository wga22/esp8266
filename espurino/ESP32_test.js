const HTTP = require("http");
const WIFI = require("Wifi");
var graphics=null;

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
  drawTime();
  setInterval(drawTime, 60000);
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

onInit();