const HTTP = require("http");
const WIFI = require("Wifi");
const FOURHOURS = 3600*1000*4;
const SURLAPI = 'http://api.wunderground.com/api/'+WUNDERAPI+'/forecast/q/';
var graphics=null;

function drawForecast()
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
drawForecast.val = "";
drawForecast.obj = null;

function writeStringToLCD(sString)
{
  graphics.clear();
  graphics.setFontVector(16);
  var nLen = 15;
  var s1 = sString.substr(0,nLen);
  var s2 = sString.substr(nLen,nLen);
  var s3 = sString.substr(nLen*2,nLen);
  graphics.drawString(s1 + "\n" + s2 + "\n" + s3, 2,2);  
  // write to the screen
  graphics.flip(); 
}

function initGraphics()
{
  graphics.on();
  graphics.clear();
  //graphics.setFontVector(16);
  drawForecast();
  setInterval(drawForecast, FOURHOURS);
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
onInit();
//E.on('init',onInit);

