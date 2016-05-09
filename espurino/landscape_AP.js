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

//Global requires
var HTTP = require("http");
var WIFI = require("Wifi");

//Global Constants / strings
var PINOUT = D2;
var nMilisPerHour = 3600000;
var STITLE = "Landscape Timer by Will Allen - V22 (2016-05-05)";
var SURLAPI = 'http://api.wunderground.com/api/13db05c35598dd93/astronomy/q/';
var SURLAPI2 = 'http://api.wunderground.com/api/13db05c35598dd93/conditions/q/';
var HTTP_HEAD = "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><link rel=\"icon\" type=\"image/png\" href=\"http://i.imgur.com/87R4ig5.png\">";
var HTTP_STYLE = "<style>.rc{fontWeight:bold;text-align:right} .lc{} .c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>";
var HTTP_HEAD_END = "</head><body><div style='text-align:left;display:inline-block;min-width:260px;'>";
//var HTTP_PORTAL_OPTIONS  = "<form action=\"/wifi\" method=\"get\"><button>Configure WiFi</button></form><br/><form action=\"/0wifi\" method=\"get\"><button>Configure WiFi (No Scan)</button></form><br/><form action=\"/i\" method=\"get\"><button>Info</button></form><br/><form action=\"/r\" method=\"post\"><button>Reset</button></form>";
var HTTP_FORM_START = "<form method='get' action='wifisave'><table>";
var HTTP_END = '<tr><td colspan="2"><button type="submit">Save</button></form></td></tr></table></div></body></html>';

//Global working variables/settings
var oWeather = {};
var sWeather = "";
var nPageLoads = 0;
var fIsOn = false;
var ZIP = '22182';
var NDELAYMINS = 5;
var durationForLights = 5;  //hours
var nSleepToDateMillis = 0;
var sMode = "nothing";
var fLightsStarted = false;

function onInit()
{
	setTimeout(initializeLightingSystem, 5500);
}

function initializeLightingSystem()
{
	setMode("initializing System.", 2000);
	nPageLoads = 0;
	setPin(false);	//turn off the light
	startWebserver();
	setTimeout(loopToStartAP, 10000);
}

function checkConnection(oState)
{
	//if not connected to a station, and AP is disabled
	if(oState && oState.station && oState.station != "connected" && oState.ap != "enabled")
	{
		console.log("restarting access point!");
		WIFI.startAP("landscape");
	}
	// else if connected to a station, AND AP is enabled, turn it off, since not good to have on when connected to station
	else if(oState && oState.station && oState.station === "connected" && oState.ap === "enabled")
	{
		//access point is still enabled, but connected to wifi, so its safe to turn off, and start the nightly process
		console("turning off AP, and making callout for weather and time");
		WIFI.stopAP();		//needed for memory reasons!
	}

	//if connected to a station, start things off
	if(oState && oState.station && oState.station === "connected" && oState.ap !== "enabled" && !fLightsStarted)
	{
		setTimeout(getWeather, 180000); 
		setTimeout(setTimeManually, 10000);
		fLightsStarted = true;
		console.log("already had conn, starting");
	}
}
//bailout if wifi no longer connected
function loopToStartAP()
{
	WIFI.getStatus(checkConnection);
	setTimeout(loopToStartAP, nMilisPerHour);//check 1x an hour?
}


//see if time is way off, and try to set with the sunset data (if available)
function setTimeManually(fForce)
{
	//BROKEN - cannot get time, weather rincomplete
	//(new Date()).getFullYear()
	var systDate = new Date();
	//look at year, and see if the weather variable is set (probably already stored in the memory)
	if(fForce===true || systDate.getFullYear() < 2010)
	{
		var sURL = SURLAPI2 + ZIP + ".json";
		console.log(sURL);
		HTTP.get((sURL), function(res)
		{
			res.on('data', function(wunderString) {(sWeather += wunderString);});
			res.on('close', function(fLoaded) 
			{
				var oDateData = JSON.parse( sWeather);
				sWeather = "";
				if(oDateData && oDateData.current_observation && oDateData.current_observation.local_epoch)
				{
					//factor of 1000 needed?
					var nOffset = parseInt(oDateData.current_observation.local_tz_offset,10)* 36;
					var nLocalEp = parseInt(oDateData.current_observation.local_epoch,10);
					console.log("got a date: "+ nOffset + " " + nLocalEp);
					if(!isNaN(nOffset) && !isNaN(nLocalEp))
					{
						setTime(nLocalEp + nOffset);
					}
				}
			});
		});
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
  HTTP.get((SURLAPI + ZIP + ".json"), function(res) 
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
			var nMinutesTilSS = oWeather.moon_phase.sunset.minute - oWeather.moon_phase.current_time.minute + NDELAYMINS;
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

function toggleLights()
{
	if(fIsOn)
	{
		turnOffLights("Lights turned off manually");
	}
	else
	{
		turnOnLights();
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
			//res.write("<li>"+oUrl.query.p+"</li>");
			//WIFI.connect(oUrl.query.s, {password:oUrl.query.p}, function(ap){ console.log("connected:"+ ap);});
			//WIFI.save();
			try
			{
				//good news, do all the fun stuff with connection to AP
				WIFI.connect(oUrl.query.s, {password:(oUrl.query.p?oUrl.query.p:"")}, 
				function(ap){ 
					console.log("connected:"); 
					WIFI.stopAP();
					WIFI.setHostname("landscape");
					WIFI.save(); 
					}
				);
				//res.write("<li>successfully connected!</li>");				
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
			setTimeManually(true);
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
				getHTMLRow('Status',sMode)
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
