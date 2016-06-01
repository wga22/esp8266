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
//flash test
//read the flash available
ESP8266.getFreeFlash();
var FLASHLOC = 487424;
var flash = require("Flash");
var flashPage = flash.getPage(FLASHLOC);
flash.read(2, FLASHLOC);
var nHR =6;
var nMinDelay = 32;
var nZIP = 99999;
var u8Arr = E.toUint8Array(((nZIP & 0xff0000)>>16), ((nZIP & 0x00ff00)>>8), (nZIP & 0x0000ff), nHR, nMinDelay);  

(u8Arr[0] << 16) + (u8Arr[1] << 8) + (u8Arr[2]) 

//write zip
E.toUint8Array("mcdonalds");

E.toString(E.toUint8Array("mcdonalds"))

		store zip and other values in flash
		
			E.toString(E.toUint8Array("mcdonalds"))
			>flash.read(12,487424)
			


*/


//Global requires
var HTTP = require("http");
var WIFI = require("Wifi");
var ESP8266 = require("ESP8266");

//Global Constants / strings
var PINOUT = D2;
var STITLE = "Landscape Timer by Will Allen - V32 (2016-05-22)";
var SURLAPI = 'http://api.wunderground.com/api/13db05c35598dd93/astronomy/q/';
var HTTP_HEAD = "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><link rel=\"icon\" type=\"image/png\" href=\"http://i.imgur.com/87R4ig5.png\">";
var HTTP_STYLE = "<style>.rc{fontWeight:bold;text-align:right} .lc{} .c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>";
var HTTP_HEAD_END = "</head><body><div style='text-align:left;display:inline-block;min-width:260px;'>";
//var HTTP_PORTAL_OPTIONS  = "<form action=\"/wifi\" method=\"get\"><button>Configure WiFi</button></form><br/><form action=\"/0wifi\" method=\"get\"><button>Configure WiFi (No Scan)</button></form><br/><form action=\"/i\" method=\"get\"><button>Info</button></form><br/><form action=\"/r\" method=\"post\"><button>Reset</button></form>";
var HTTP_FORM_START = "<form method='get' action='wifisave'><table>";
var HTTP_END = '<tr><td colspan="2"><button type="submit">Save</button></form></td></tr></table></div></body></html>';

//Global working variables/settings
var nPageLoads = 0;
var nBrokenWIFIConnections = 0;
var fIsOn = false;
var ZIP = '22182';
var NDELAYMINS = 5;
var durationForLights = 5;  //hours
var nSleepToDateMillis = 0;
var sMode = "nothing";
var fLightsStarted = false;
var NTZ = -4;
var NMILIPERMIN = 60000;
var NMILISPERHOUR = 60*NMILIPERMIN;

function onInit()
{
	setTimeout(initializeLightingSystem, 15000);
}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);  
}

function initializeLightingSystem()
{
	setMode("initializing System.", 10000);
	nPageLoads = 0;
	fLightsStarted = false;
	setPin(false);	//turn off the light
	startWebserver();
	loopToStartAP();
}

//bailout if wifi no longer connected
function loopToStartAP()
{
	WIFI.getStatus(checkConnection);
	setTimeout(loopToStartAP, NMILISPERHOUR);//check 1x an hour to see if AP needs to be started
}
function setSnTP()
{
	var sHost = 'us.pool.ntp.org';
	console.log("set SNTP:" + sHost + " TZ:" + NTZ);
	WIFI.setSNTP(sHost, NTZ);
}

function checkConnection(oState)
{
	//if not connected to a station, and AP is disabled
	if(oState && oState.station)
	{
		if(oState.station != "connected" && oState.ap != "enabled")
		{
			if(fLightsStarted && nBrokenWIFIConnections < 24)	//maybe wifi is temporarily down, so dont overreact, give one chance
			{
				nBrokenWIFIConnections++;
			}
			else
			{
				console.log("restarting access point!" + nBrokenWIFIConnections);
				WIFI.startAP("landscape", null, function(){console.log("connected as AP");});
				WIFI.save();
				ESP8266.reboot();		//seeme to be needed to make AP be accessible correctly	
			}
		}
		// else if connected to a station, AND AP is enabled, turn it off, since not good to have on when connected to station
		else if(oState.station === "connected" && oState.ap === "enabled")
		{
			//access point is still enabled, but connected to wifi, so its safe to turn off, and start the nightly process
			console("turning off AP, and making callout for weather and time");
			WIFI.stopAP();		//needed for memory reasons!
			nBrokenWIFIConnections = 0;	//reset the counter, found a good connection!
		}

		//if connected to a station, start things off
		if( oState.station === "connected" && oState.ap !== "enabled" && !fLightsStarted)
		{
			fLightsStarted = true;
			console.log("Already had conn, starting.  Reset count: " + nBrokenWIFIConnections);
			setTimeout(getWeather, 60000);
		}
	}
	if(!dateIsSet())
	{
		setSnTP();
		WIFI.save();
	}
	pingSite();
}

function pingSite()
{
	var sSite = 'http://cloudservices-willcode.rhcloud.com/';
	HTTP.get(sSite, function(res) 
	{
		res.on('data', function(sdta) { sdta; });
		res.on('close', function(fLoaded) {fLoaded;});
	})
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
      var newOffset = NTZ  + nCurHr - nWNDHR +12;
      newOffset = (newOffset % 24) - 12;
      console.log("TZ: " + NTZ + " changes to " + newOffset );
	  NTZ = newOffset;
      setSnTP();
	  WIFI.save();
	}
}

//populate the weather variable with the sunset, etc
function getWeather()
{
	setMode("getting Weather", 2000);
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

			//make sure its in middle of the hour
			if(nCTMn > 5 && nCTMn < 55 )
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
			else
			{
				var sMessage = "after sunset too late for lights";
				console.log(sMessage);
				turnOffLights(sMessage);
			}
		});
	});
  //what to do if didnt get?
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
		//TODO: worry about too many threads??
		turnOnLights();	//use function, so lights are never on indefinitely
	}
}

function turnOnLights()
{
  setPin(true);
  var nMilisForLights = durationForLights*NMILISPERHOUR;
  setMode("after sunset, running lights", "Turn off Lights", nMilisForLights);
  setTimeout(turnOffLights, (nMilisForLights));
}

function turnOffLights(sMessage)
{
  setPin(false);
  var nSleepTilMorning = (12*NMILISPERHOUR);
  setMode(("Lights off" + (sMessage ? sMessage : "")), "Get Weather", nSleepTilMorning);
  setTimeout(getWeather, nSleepTilMorning);
}

function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}

function setMode(a_sMode, a_sNext , a_nSleepDuration)
{
  //set global variable with the date that next action happens
  var nSleepToDateMillis = ((new Date()).getTime()) + a_nSleepDuration;
  // set global variable indicating what system is currently doing
  sMode = dateString(new Date()) + ": " + a_sMode + " (Next action: " +a_sNext + " " + (dateString(new Date(nSleepToDateMillis))) + ')';
  //log out what is going on
  console.log(sMode); 
}

function setPin(fSet)
{
	fIsOn = (fSet === true);
	_setpin(fIsOn, PINOUT);
	_setpin(fIsOn, D13);
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
	res.write(HTTP_HEAD_END + "<h2>Welcome to "+STITLE+"</h2>");
	res.write(HTTP_FORM_START);

	//see if connected to an access point...
	var oWifiStatus = WIFI.getStatus();
	if( oWifiStatus && oWifiStatus.station && oWifiStatus.station!="connected")
	{
		//see if user is submitting AP details
		if(oUrl && oUrl.query && oUrl.query.s)
		{
			console.log("attempting to connect to " + oUrl.query.s);
			res.write("<li>Connecting to " + oUrl.query.s+"</li>");
			try
			{
				//good news, do all the fun stuff with connection to AP
				WIFI.connect(oUrl.query.s, {password:(oUrl.query.p?oUrl.query.p:"")}, 
				function(ap){ 
					//all actions of consequence are done by the hourly loop (SNTP, etc)
					console.log("connected to " + oUrl.query.s); 
					}
				);
			}
			catch(e)
			{
				res.write(getHTMLRow("failed to connect to", oUrl.query.s));
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
		if(oUrl && oUrl.query && oUrl.query.z && parseInt(oUrl.query.z, 10) && parseInt(oUrl.query.z, 10).length==5)
		{
			ZIP = parseInt(oUrl.query.z, 10);
		}
		if(oUrl && oUrl.query && oUrl.query.d && parseInt(oUrl.query.d, 10))
		{
			durationForLights = parseInt(oUrl.query.d, 10);
		}
		if(oUrl && oUrl.query && oUrl.query.m && parseInt(oUrl.query.m, 10))
		{
			NDELAYMINS = parseInt(oUrl.query.m, 10);
		}

		if(req.url ==  "/toggle")
		{
			toggleLights();
		}
		else if(req.url == "/reset")
		{
			getWeather();
		}

		res.write(
			getHTMLRow('System time', dateString(new Date())) + 
			getInputRow('Zip Code','z', ZIP) +
			getInputRow('Light Duration (hours)','d', durationForLights) + 
			getInputRow('Delay from Sunset (mins)','m', NDELAYMINS));

		res.write(getHTMLRow(getButton("toggle", ("Turn " + (fIsOn?"Off":"On"))),getButton("status", ("Status"))));

		//add in status values
		if(req.url == "/status")
		{
			res.write(getHTMLRow('WebPage loads',nPageLoads) +
				getHTMLRow('Host',JSON.stringify(WIFI.getIP())) + 
				getHTMLRow('Status',sMode) +
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
onInit();