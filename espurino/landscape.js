/*
	Title / Purpose: Control ATX power supply to run a landscape light
	Author: Will.allen%%gmail.com
	TODO: 
		rename global variables (or put into a hashmap?)
		implement reset / deepsleep?
	Created: April 2016
	Modified:
	REQUIRED:  Must have set all wifi properties manually on your Esprunio (tested on version 1.84)
*/

var nPageLoads = 0;
var sVersion = 'V21 (2016-04-30) - by Will Allen';
var oWeather = {};
var sWeather = "";
var SURLAPI = 'http://api.wunderground.com/api/13db05c35598dd93/astronomy/q/';
var SURLAPI2 = 'http://api.wunderground.com/api/13db05c35598dd93/conditions/q/';
var fIsOn = false;
var nMilisPerHour = 3600000;
var durationForLights = 5;  //hours
var nSleepToDateMillis = 0;
var sMode = "nothing";
var PINOUT = D2;
var dBootTime = new Date();
var nMaxRetriesForGetInitDate = 30;
var HTTP = require("http");
var ESP8266 = require("ESP8266");
var WIFI = require("Wifi");
var ZIP = '22182';

function onInit()
{
	setTimeout(initializeLightingSystem, 5500);
	setTimeout(getWeather, 30000);  //wait o call out and get latest weather
}

function initializeLightingSystem()
{
	setMode("initializing System.", 2000);
	ESP8266.setCPUFreq(80);	//save power?
	nPageLoads = 0;
	setPin(false);	//turn off the light
	setTimeManually();
	startWebserver();
}

//see if time is way off, and try to set with the sunset data (if available)
function setTimeManually()
{
	var systDate = new Date();
	//look at year, and see if the weather variable is set (probably already stored in the memory)
	if(systDate.getFullYear() < 2000)
	{
		HTTP.get(SURLAPI2 + ZIP + ".json", function(res) 
		{
			res.on('data', function(wunderString) {(sWeather += wunderString);});
			res.on('close', function(fLoaded) 
			{
				var oDateData = JSON.parse( sWeather);
				sWeather = "";
				if(oDateData && oDateData.observation_epoch)
				{
					var nMillisCurrentTime = parseInt(oDateData.observation_epoch)*1000;
					console.log(oDateData.observation_epoch + " " + ((new Date(nMillisCurrentTime)).toUTCString()));
					setTime(nMillisCurrentTime);
				}
			});
		});
	}
}

//set the initialization time, but has to be after the NTP is successful
function setBootTime()
{
	var systDate = new Date();
	//date is still 1970 Jan 1
	if(systDate.getFullYear() < 2000 && nMaxRetriesForGetInitDate-- > 0)
	{
		setTimeout(setBootTime, 5000);
		return;  //just to be safe, end of the road
	}
	//tried max tries, still no date
	else if(nMaxRetriesForGetInitDate === 0)
	{
		setTimeManually();
		nMaxRetriesForGetInitDate = 30;
		dBootTime = systDate;
	}
	else
	{
		nMaxRetriesForGetInitDate = 30;
		dBootTime = systDate;
	}
}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);  
}

//populate the weather variable with the sunset, etc
function getWeather()
{
  setMode("getting Weather", 2000);
  HTTP.get(SURLAPI + ZIP + ".json", function(res) 
   {
    res.on('data', function(wunderString) {   sWeather += wunderString;   });
    res.on('close', function(fLoaded) 
	{
      console.log("Connection to wunder closed");
      oWeather = JSON.parse( sWeather );
      sWeather = "";
      sleepTilSunset();	//wait until you get the weather, then sleep until the sunset
    });
  });
  //what to do if didnt get?
}

function sleepTilSunset()
{
      try  //try due to possibility weather didnt get loaded.
      {
        //if sunset is still coming (ignore minutes)
		var nHoursTilSunset = oWeather.moon_phase.sunset.hour - oWeather.moon_phase.current_time.hour; 
        if(nHoursTilSunset > 0)
        {
			//add 15 minutes from sunset
			var nMinutesTilSS = oWeather.moon_phase.sunset.minute - oWeather.moon_phase.current_time.minute + 5;
			var nSleepTime = (nHoursTilSunset*nMilisPerHour) + (nMinutesTilSS*60000);
			setMode("sleeping until sunset", "Turn on lights", nSleepTime);
			setTimeout(turnOnLights, nSleepTime);
        }
		//should lights be on?
        else if((nHoursTilSunset + durationForLights) > 1)
        {
			turnOnLights();
        }
		else
		{
            //its already after dark, so turn off the lights
            turnOffLights();
		}
      }
      catch(e)
      {
		console.log("there was an issue reading the weather data:" + e);
        //try using the system time
		var nSystemSleepTime= getMillisTilSunsetFromSystem();
		if(nSystemSleepTime > 0)
		{
			setMode("sleeping until sunset (manual)", "Turn on lights", nSystemSleepTime);
			setTimeout(turnOnLights, nSystemSleepTime);
		}
		else  //even system time didnt work, so try again in 12 hrs
		{
			turnOffLights("sys and wunder fail");
		}
      }
}

function turnOnLights()
{
  setPin(true);
  var nMilisForLights = durationForLights*nMilisPerHour;
  setMode("after sunset, running lights", "Turn off Lights", nMilisForLights);
  setTimeout(turnOffLights, (nMilisForLights));
}

function turnOffLights(sMessage)
{
  setPin(false);
  var nSleepTilMorning = (12*nMilisPerHour);
  setMode(("Lights off" + (sMessage ? sMessage : "")), "Get Weather", nSleepTilMorning);
  setTimeout(getWeather, nSleepTilMorning);
}

function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}

function setMode(a_sMode, a_sNext , a_sSleepDuration)
{
  //set global variable with the date that next action happens
  var nSleepToDateMillis = ((new Date()).getTime()) + a_sSleepDuration;
  // set global variable indicating what system is currently doing
  sMode = dateString(new Date()) + ": " + a_sMode + " (Next action: " +a_sNext + " " + (dateString(new Date(nSleepToDateMillis))) + ')';
  //log out what is going on
  console.log(sMode); 
}

function setPin(fSet)
{
  fIsOn = fSet;
//; digitalWrite(D4, 255); for(var x=0; x < 5000; x++){digitalWrite(D4, 0)}; digitalWrite(D4, 255);
  pinMode(PINOUT, "output"); 
  if(fIsOn)
  {
      //pull low to turn on
      digitalWrite(PINOUT, 0);
  }
  else
  {
    digitalWrite(PINOUT, 255);  
  }
}

//event for webserver
function getPage(req,res) 
{
	console.log("URL requested: " + req.url);
	nPageLoads++;
	if(req.url ==  "/on")
	{
		turnOnLights();
	}
	else if(req.url ==  "/off")
	{
		turnOffLights();
	}
	else if(req.url ==  "/toggle")
	{
		setPin(!fIsOn);
	}
	else if(req.url == "/reset")
	{
		setTimeManually();
		getWeather();
	}
	var sContent = "<h2>Welcome to landscape light timer ("+sVersion+")</h2>";
	sContent +="<ul>";
	sContent += '<li><b>System time</b>: ' + dateString(new Date());
	sContent += '<li><b>Status</b>:' + sMode;
	sContent += '<li><b>Light</b> is ' + (fIsOn ? "ON" : "OFF");

	try
	{
		sContent += "<li><b>Sunset data was loaded</b>: " + oWeather.moon_phase.current_time.hour 
			+ ":" + oWeather.moon_phase.current_time.minute + "</li>";
		sContent += "<li><b>Sunset</b>: " + oWeather.moon_phase.sunset.hour 
			+ ":" + oWeather.moon_phase.sunset.minute + "</li>";
	}
	catch(e)
	{
		sContent += "<li><b>Issue loading the weather data or not yet available</b>";
	}
	if(req.url == "/status")
	{
		sContent += '<li><b>WebPage loads</b>:' + (nPageLoads);
		//sContent += '<li><b>Init called</b>:' + "";
		sContent += '<li><b>Boot Time</b>:' + dBootTime.toUTCString();
		try
		{
			sContent += '<li><b>ESP debug:</b>'+ (JSON.stringify((ESP8266.getState()))) +'</ul>';
		}
		catch(e)
		{
			sContent +='<li><b>Issue getting ESP8266 status</b></li>';
		}
	}
	sContent +="</ul>";
	sContent += '<table style="width:90%"><tr>';
	sContent += '<td><button type="button" onclick="document.location=\'/on\'">Lights On</button></td>';
	sContent += '<td><button type="button" onclick="document.location=\'/off\'">Lights Off</button></td>';
	sContent += '<td><button type="button" onclick="document.location=\'/toggle\'">Toggle</button></td>';
	sContent += '<td><button type="button" onclick="document.location=\'/status\'">Status</button></td>';
	sContent += '</tr></table>';
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('<html><head><link rel="icon" type="image/png" href="http://i.imgur.com/87R4ig5.png"></head><body>'+ sContent +'</body></html>');
	res.end();
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

function getMillisTilSunsetFromSystem()
{
	var dSysDate = new Date();
	var nMillis = -1;  // -1 means sunset has either passed, or system time not set
	if(dSysDate.getFullYear() > 2000)
	{
		//ignore DST
		var aSunsetTimesForMonth = [17,18,18, 18, 19, 19,19,19,18,18,18,17 ];
		var nCurrentHour = dSysDate.getHours();
		var nSunsetTime = aSunsetTimesForMonth[dSysDate.getMonth()];
		if(nCurrentHour < nSunsetTime)
		{
			nMillis = nMilisPerHour * (nSunsetTime -nCurrentHour );
		}
	}
	else  //sysdate not set, so nothing we can do!
	{
		console.log("Unable to get system date: " + dSysDate.toUTCString());
	}
	return nMillis;
}
onInit();
