/*
	Title / Purpose: test access point on ESP8266
	Author: Will.allen%%gmail.com
	TODO: 
	Created: May 2016
	Modified:
	REQUIRED:  Must have set all wifi properties manually on your Esprunio (tested on version 1.85)
*/


//Global requires
var HTTP = require("http");
var WIFI = require("Wifi");
var ESP8266 = require("ESP8266");

//Global Constants / strings
var PINOUT = D2;
var STITLE = "AP tester Will Allen - V31 (2016-05-16)";
var SURLAPI = 'http://api.wunderground.com/api/13db05c35598dd93/astronomy/q/';
var HTTP_HEAD = "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><link rel=\"icon\" type=\"image/png\" href=\"http://i.imgur.com/87R4ig5.png\">";
var HTTP_STYLE = "<style>.rc{fontWeight:bold;text-align:right} .lc{} .c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>";
var HTTP_HEAD_END = "</head><body><div style='text-align:left;display:inline-block;min-width:260px;'>";
//var HTTP_PORTAL_OPTIONS  = "<form action=\"/wifi\" method=\"get\"><button>Configure WiFi</button></form><br/><form action=\"/0wifi\" method=\"get\"><button>Configure WiFi (No Scan)</button></form><br/><form action=\"/i\" method=\"get\"><button>Info</button></form><br/><form action=\"/r\" method=\"post\"><button>Reset</button></form>";
var HTTP_FORM_START = "<form method='get' action='wifisave'><table>";
var HTTP_END = '<tr><td colspan="2"><button type="submit">Save</button></form></td></tr></table></div></body></html>';

//Global working variables/settings
var nPageLoads = 0;
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
	setTimeout(startWebserver, 15000);
	setTimeout(loopToStartAP, NMILIPERMIN);
}

//bailout if wifi no longer connected
function loopToStartAP()
{
	WIFI.getStatus(checkConnection);
	setTimeout(loopToStartAP, NMILIPERMIN);//check 1x an hour to see if AP needs to be started
}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);  
}


function checkConnection(oState)
{
	//if not connected to a station, and AP is disabled
	if(oState && oState.station)
	{
		console.log("checking connection: " + oState.station + " AP: " + oState.ap);
		if(oState.station != "connected" && oState.ap != "enabled")
		{
			console.log("restarting access point!");
			WIFI.startAP("landscape", null, function(){console.log("connected as AP");});
			WIFI.save();
			fLightsStarted = false;	//something happened, so reset system.  when we do get a connection again, we will now know to start system again!
			ESP8266.reboot();		//seeme to be needed to make AP be accessible correctly				
		}
		// else if connected to a station, AND AP is enabled, turn it off, since not good to have on when connected to station
		else if( oState.station === "connected" && oState.ap === "enabled")
		{
			//access point is still enabled, but connected to wifi, so its safe to turn off, and start the nightly process
			console("turning off AP, and making callout for weather and time");
			WIFI.stopAP();		//needed for memory reasons!
		}

		//if connected to a station, start things off
		if( oState.station === "connected" && oState.ap !== "enabled" && !fLightsStarted)
		{
			fLightsStarted = true;
			console.log("great, we are connected as a station!");
		}
	}
}


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
					console.log("stopping AP, now connected as station"); 
					WIFI.stopAP();
					//WIFI.setHostname("landscape" + nRand);
					setSnTP();
					//WIFI.save(); 
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

		res.write(getHTMLRow('System time', dateString(new Date())));

		//res.write(getHTMLRow(getButton("toggle", ("Turn " + (fIsOn?"Off":"On"))),getButton("status", ("Status"))));

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
function setSnTP()
{
	var sHost = 'us.pool.ntp.org';
	console.log("set SNTP:" + sHost + " TZ:" + NTZ);
	WIFI.setSNTP(sHost, NTZ);
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
function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}

onInit();
