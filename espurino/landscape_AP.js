/*
	Title / Purpose: Control ATX power supply to run a landscape light
	Author: Will.allen%%gmail.com
	TODO: 
		rename global variables (or put into a hashmap?)
		implement reset / deepsleep?
				
	Created: April 2016
	Modified:
	REQUIRED:  
*/
/*
http://api.wunderground.com/api/XXXXX/astronomy/q/22182.json

{
  "response": {
  "version":"0.1",
  "termsofService":"http://www.wunderground.com/weather/api/d/terms.html",
  "features": {
  "astronomy": 1
  }
	}
		,	"moon_phase": {
		"percentIlluminated":"1",
		"ageOfMoon":"28",
		"phaseofMoon":"Waning Crescent",
		"hemisphere":"North",
		"current_time": {
		"hour":"8",
		"minute":"38"
		},
		"sunrise": {
		"hour":"6",
		"minute":"18"
		},
		"sunset": {
		"hour":"19",
		"minute":"56"
		},
		"moonrise": {
		"hour":"6",
		"minute":"01"
		},
		"moonset": {
		"hour":"19",
		"minute":"05"
		}
	},
	"sun_phase": {
		"sunrise": {
		"hour":"6",
		"minute":"18"
		},
		"sunset": {
		"hour":"19",
		"minute":"56"
		}
	}
}
			

*/

//Global requires
const HTTP = require("http");
const WIFI = require("Wifi");
const ESP8266 = require("ESP8266");
const flash = require("Flash");

//Global Constants / strings
const PINOUT = D2;
const STITLE = 'IOT Landscape Timer - V42 (2018-03-18)';
const SURLAPI = 'http://api.wunderground.com/api/13db05c35598dd93/astronomy/q/';
const HTTP_HEAD = '<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><link rel=\"icon\" type=\"image/png\" href=\"http://i.imgur.com/87R4ig5.png\">';
const HTTP_STYLE = '<style>.rc{fontWeight:bold;text-align:right} .lc{} .c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>';
const HTTP_HEAD_END = '</head><body><div style="text-align:left;display:inline-block;min-width:260px;">';
const HTTP_FORM_START = '<form method="get" action="save"><table>';
const HTTP_END = '<tr><td colspan="2"><button type="submit">Save</button></form></td></tr></table></div></body></html>';
const NMILIPERMIN = 60000;
const NMILISPERHOUR = 60*NMILIPERMIN;
const NHOSTPAD = 20;

var NDELAYMINS = 5;
var fIsOn = false;
var nPageLoads = 0;
var nDaysAlive = 0;
var nBrokenWIFIConnections = 25;	//initialize the system to go into AP mode
var ZIP = '22182';
var durationForLights = 5;  //hours
var NTZ = -4;
var nSleepToDateMillis = 0;
var sMode = 'nothing';
var nFlashLocation = -1;
var sSunsetTimeMsg = 'UNDEF';

function onInit()
{
	try
	{
		nFlashLocation = ESP8266.getFreeFlash()[0].addr;
		ESP8266.setCPUFreq(80);
	}
	catch(e)
	{
		console.log("issue getting a spot for the FLASH");
	}
	clearInterval();
	setTimeout(initializeLightingSystem, NMILIPERMIN/6);
}

function initializeLightingSystem()
{
	setMode("initializing System.", NMILIPERMIN/6);
	nPageLoads = 0;
	readValuesFromFlash();
	setPin(false);	//turn off the light
	startWebserver();
	setSNTPServer();
	//SONOFF - need to add code to restore WIFI settings here
	checkConnectionThenStart();
	setInterval(checkConnectionThenStart,NMILISPERHOUR*24);	//run daily
}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);
}

function setSNTPServer()
{
	var sHost = 'us.pool.ntp.org';
	console.log("set SNTP:" + sHost + " TZ:" + NTZ);
	WIFI.setSNTP(sHost, NTZ);
	WIFI.save();
}

function checkConnectionThenStart()
{
	nDaysAlive++;
	WIFI.getStatus(checkConnection);
}

function checkConnection(oState)
{
	//if not connected to a station, and AP is disabled
	if(oState && oState.station)
	{
		if(oState.station != "connected" && oState.ap != "enabled")
		{
			sSunsetTimeMsg = "Cannot connect to WIFI";
			nBrokenWIFIConnections++;
			if(nBrokenWIFIConnections > 12)  //maybe wifi is temporarily down, so dont overreact,a few chances
			{
				console.log("restarting access point!" + nBrokenWIFIConnections);
				WIFI.startAP("landscape", null, function(){console.log("connected as AP");});
				WIFI.save();
				ESP8266.reboot();		//seems to be needed to make AP be accessible correctly
			}
		}
		// else if connected to a station, AND AP is enabled, turn it off, since not good to have on when connected to station
		else if(oState.station === "connected" && oState.ap === "enabled")
		{
			//access point is still enabled, but connected to wifi, so its safe to turn off, and start the nightly process
			console("turning off AP, and making callout for weather and time");
			WIFI.stopAP();		//needed for memory reasons!
			WIFI.save();
		}

		//if connected to a station, start things off
		if( oState.station === "connected")
		{
			console.log("Already had conn, starting.  Reset count: " + nBrokenWIFIConnections);
			try
			{
				getWeather();
			}
			catch(e)
			{
				console.log("Issue with getWeather");
				ESP8266.reboot();	//TODO: is this too much?
			}
			nBrokenWIFIConnections = 0;	//reset the counter, found a good connection!
		}
		else //sleep then try again! - might be in AP mode also, but still waiting for either type of connection
		{
			nBrokenWIFIConnections++;
			console.log("Couldn't get a connection");
			setTimeout(checkConnectionThenStart, (NMILIPERMIN*5));	//wait 5 mins, then try again
		}
	}
}

function dateIsSet()
{
	return (new Date()).getFullYear() > 2010;
}

function fixTimeZone(nWNDHR)
{
	var oDate = new Date();
	var nCurHr = oDate.getHours();
	//time from wunderground not matching current time, maybe TZ is wrong?!
	if(dateIsSet() && nCurHr != nWNDHR)
	{
		// Local time zone offset in the range -11..13.
		var newOffset = nWNDHR-nCurHr;
		newOffset = newOffset + NTZ;	//adjust for what you currently think it is
		if(newOffset>13)
		{
			newOffset = newOffset - 24;
		}
		if(newOffset<-11)
		{
			newOffset = newOffset + 24;
		}
		console.log("nCurHr:" + nCurHr + " nWNDHR:" + nWNDHR + " newOffset: " + newOffset);
		//console.log("TZ: " + NTZ + " changes to " + newOffset );
		NTZ = newOffset;
		setSNTPServer();	//needed to update timezone
	}
}

//populate the weather variable with the sunset, etc
function getWeather()
{
	//getting weather now, so allow another process to get weather
	setMode("getting Weather", NMILIPERMIN/10);
	getWeather.val = "";
	HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
	{
		res.on('data', function(wunderString) {   getWeather.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			console.log("Connection to wunder closed");
			var oWeather = JSON.parse( getWeather.val );
			getWeather.val = "";

			var nSSHr = parseInt(oWeather.moon_phase.sunset.hour,10);
			var nSSMn = parseInt(oWeather.moon_phase.sunset.minute,10);
			var nCTHr = parseInt(oWeather.moon_phase.current_time.hour,10);
			var nCTMn = parseInt(oWeather.moon_phase.current_time.minute,10);
			var nMilisToSunset = ((nSSMn - nCTMn) * NMILIPERMIN) + ((nSSHr - nCTHr) * NMILISPERHOUR);
			sSunsetTimeMsg = nSSHr + ":" + (nSSMn > 9 ? nSSMn : ("0"+nSSMn));
			//make sure its in middle of the hour
			if(nCTMn > 2 && nCTMn < 58)
			{
				fixTimeZone(nCTHr);	
			}
			//either not yet sunset
			if(nMilisToSunset > 0)
			{
				setMode("waiting for sunset", "turn on lights", nMilisToSunset);
				setTimeout(turnOnLights, nMilisToSunset);
			}
			else if((nMilisToSunset + (durationForLights*NMILISPERHOUR)) > 0)  //sunset recently passed
			{
				console.log("after sunset, before lights off");
				turnOnLights();
			}
			else //wait until tomorrow morning, and check weather then
			{
				setTimeout(getWeather, (NMILISPERHOUR*4));	//wait 4 hours, and see if positive number then
			}
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
getWeather.val = "";

function toggleLights()
{
	if(fIsOn)
	{
		setPin(false);	//simply turn off, dont use function since it has setTimeout
	}
	else
	{
		turnOnLights();	//use function, so lights are never on indefinitely
	}
}

function turnOnLights()
{
	setPin(true);
	var nMilisForLights = durationForLights*NMILISPERHOUR;
	setMode("after sunset, running lights", "Turn off Lights", nMilisForLights);
	setTimeout(turnOffLights, (nMilisForLights));  
	//setTimeout(rebootIt, (nMilisForLights));  
}

//turn off lights, and reboot
function rebootIt(sMessage)
{
	setPin(false);
	ESP8266.reboot();
}

function turnOffLights(sMessage)
{
	setPin(false);
	setMode("Lights off" + (sMessage ? sMessage : ""));
}

function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}

function setMode(a_sMode, a_sNext , a_nSleepDuration)
{
	sMode = dateString(new Date()) + ": " + a_sMode;
	if(a_sNext)
	{
		sMode += " Next action: " + a_sNext;
	}
	if(a_nSleepDuration)
	{
		var nSleepToDateMillis = ((new Date()).getTime()) + a_nSleepDuration;
		sMode += " ( " + (dateString(new Date(nSleepToDateMillis))) + ")";
	}
	//log out what is going on
	console.log(sMode); 
}

function setPin(fSet)
{
	fIsOn = (fSet === true);
	try
	{
		_setpin(fIsOn, PINOUT);
		_setpin(!fIsOn, D12);	//SONOFF
		_setpin(fIsOn, D13);		
	}
	catch(e)
	{
		console.log("issue writing to pin");
	}
}

function _setpin(fSet, sPin)
{
	pinMode(sPin, "output"); 
	if(fSet)
	{
	//pull low to turn on
		digitalWrite(sPin, 0);
	}
	else
	{
		digitalWrite(sPin, 255);
	}
}

//event for webserver
function getPage(req,res) 
{
	nPageLoads++;
	console.log("URL requested: " + req.url);
	var oUrl = url.parse(req.url, true);
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(HTTP_HEAD);
	res.write(HTTP_STYLE);
	res.write('<title>'+STITLE+'</title><link rel="icon" type="image/png" href="http://i.imgur.com/87R4ig5.png"/>');
	res.write(HTTP_HEAD_END + '<h2>Welcome to '+STITLE+'</h2>');
	res.write(HTTP_FORM_START);

	//see if connected to an access point...
	var oWifiStatus = WIFI.getStatus();
	if( oWifiStatus && oWifiStatus.station && oWifiStatus.station!="connected")
	{
		//see if user is submitting AP details
		if(oUrl && oUrl.query && oUrl.query.s)
		{
			console.log('attempting to connect to ' + oUrl.query.s);
			res.write('<li>Connecting to ' + oUrl.query.s+'</li>');
			try
			{
				//good news, do all the fun stuff with connection to AP
				WIFI.connect(oUrl.query.s, {password:(oUrl.query.p?oUrl.query.p:"")},
				function(ap){ 
					//all actions of consequence are done by the hourly loop (SNTP, etc)
					console.log("connected to " + oUrl.query.s); 
					nBrokenWIFIConnections = 0;
					}
				);
			}
			catch(e)
			{
				res.write(getHTMLRow('failed to connect to', oUrl.query.s));
				console.log("failed to connect:" +e);
			}
		}
		else  //write out the form for the SSID and password
		{
			res.write(getInputRow('SSID', 's', 'SSID', 32) + getInputRow('Password','p', 'password', 64) );
		}
	}
	else  //normal page
	{
		var fSomethingChanged = false;
		if(oUrl && oUrl.query && oUrl.query.z && (oUrl.query.z+"").length ===5 && oUrl.query.z!=ZIP)
		{
			ZIP = oUrl.query.z;
			fSomethingChanged = true;
		}
		if(oUrl && oUrl.query && oUrl.query.d && parseInt(oUrl.query.d, 10)&&durationForLights != parseInt(oUrl.query.d, 10))
		{
			durationForLights = parseInt(oUrl.query.d, 10);
			fSomethingChanged = true;
		}
		if(oUrl && oUrl.query && oUrl.query.m && parseInt(oUrl.query.m, 10) && NDELAYMINS != parseInt(oUrl.query.m, 10))
		{
			NDELAYMINS = parseInt(oUrl.query.m, 10);
			fSomethingChanged = true;
		}
		if(fSomethingChanged)
		{
			writeValuesToFlash();
		}

		if(req.url ==  "/toggle")
		{
			toggleLights();
		}
		else if(req.url == "/reset")
		{
			setTimeout(checkConnectionThenStart, 2000);
		}
		else if(req.url == "/reboot")
		{
			res.end();
			ESP8266.reboot();
			return;
		}

		if (!dateIsSet())
		{
			setTimeout(setSNTPServer, 2000);
		}

		res.write(
			getHTMLRow('System time', dateString(new Date())) + 
			getHTMLRow('Sunset', sSunsetTimeMsg) + 
			getInputRow('Zip Code','z', ZIP) +
			getInputRow('Light Duration (hours)','d', durationForLights) + 
			getInputRow('Delay from Sunset (mins)','m', NDELAYMINS));

		res.write(getHTMLRow(getButton("toggle", ("Turn " + (fIsOn?"Off":"On"))),getButton(((req.url == "/status")? "" : "status"), ("Status"))));

		//add in status values
		if(req.url == "/status")
		{
			res.write(getHTMLRow('WebPage loads',nPageLoads) +
				getHTMLRow('Host',JSON.stringify(WIFI.getIP())) + 
				getHTMLRow('Status',sMode) +
				getHTMLRow('Days Awake',nDaysAlive) +
				getHTMLRow('ESP:',JSON.stringify(ESP8266.getState())) +
				getHTMLRow('Timezone offset:', NTZ) +
				getHTMLRow('Bad Station Count',nBrokenWIFIConnections)
			);
		}
	}
	//console.log("URL requested: " + req.url);

	res.write(HTTP_END);
	res.end();
}

function getHTMLRow(sLeft, sRight)
{
	return '<tr><td class="lc">'+sLeft+'</td><td class="rc">'+sRight+'</td></tr>';
}

function getInputRow(sLabel, sID, sPH, nLen)
{
	return getHTMLRow(sLabel, ('<input id="'+sID+'" name="'+sID+'" length="'+nLen+'" placeholder="'+sPH+'"/>'));
}

function getButton(sAction, sLabel)
{
	return '<button type="button" onclick="document.location=\'/'+sAction+'\'">'+sLabel+'</button>';
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
function readValuesFromFlash()
{
	if(nFlashLocation > -1)
	{
		var u8FVals = flash.read(64, nFlashLocation);
		var sVals = E.toString(u8FVals);
		if(sVals && sVals.length > 0 && sVals.indexOf("|",0)>-1)
		{
			var aParts = sVals.split("|");
			if(aParts.length >= 3)
			{
				ZIP = aParts[0];
				var nDelay = parseInt(aParts[1],10);
				if(nDelay > -1 && nDelay != NDELAYMINS)
				{
					NDELAYMINS = nDelay;
				}
				var nDur = parseInt(aParts[2],10);
				if(nDelay > -1 && nDur != durationForLights)
				{
					durationForLights = nDur;
				}
			}
		}
	}
}

function writeValuesToFlash()
{
    var sSaveString = ZIP + "|" + NDELAYMINS + "|" + durationForLights+"|.";
	while(sSaveString.length % 4 !==0)
	{
		sSaveString += "0";
	}
	var uaArr = E.toUint8Array(sSaveString);
	if(nFlashLocation > -1)
	{
		flash.erasePage(nFlashLocation);
		flash.write(uaArr, nFlashLocation);
	}
	else
	{
		try
		{
			nFlashLocation = ESP8266.getFreeFlash()[0].addr;
		}
		catch(e){}
	}
	return uaArr;
}

function initAPWifi()
{
	//set the AP to be on
	WIFI.setDHCPHostname("landscape");
    WIFI.save();
	WIFI.disconnect();
	WIFI.connect("dummy", {password:"dummy"},function(x){});
	WIFI.disconnect();
	//set the hostname
	WIFI.startAP("landscape");
	WIFI.save();
	ESP8266.reboot();
}
