/*
	Title / Purpose: log temperature and solar output to thingspeak; run under solar power
	Author: Will.allen%%gmail.com
	TODO: 
				
	Created: July 2016
	Modified:
	REQUIRED:  
*/

//
var SSID = 'XXXX';
var WIFIPASSWORD = 'yeah_right';

//Global requires
var HTTP = require("http");
var WIFI = require("Wifi");
var ESP8266 = require("ESP8266");

//Global Constants / strings
var ANALOGPIN = 0;
var NMILIPERMIN = 60000;
var NMILISPERHOUR = 60*NMILIPERMIN;
var THINGSPEAKURL = 'http://api.thingspeak.com/update';
var sThingspeakKey = '0NRCT2ZN3PNTMHUG';
var fInitialized = false;

function onInit()
{
	if(!fInitialized)
	{
		fInitialized = true;
		ESP8266.setCPUFreq(80);	//save power?		
		setTimeout(hourlyLoop, NMILIPERMIN/4);
	}
}

//bailout if wifi no longer connected
function hourlyLoop()
{
	WIFI.getStatus(checkConnectionThenRun);
	setTimeout(hourlyLoop, NMILISPERHOUR);//check 1x an hour to see if AP needs to be started
}

function checkConnectionThenRun(oState)
{
	//if not connected to a station, and AP is disabled
	if(oState && oState.station)
	{
		var fWIFIChange = false;
		if( oState.station != "connected" )
		{
				WIFI.connect(SSID, {password:WIFIPASSWORD}, 
				function(ap){ 
					//all actions of consequence are done by the hourly loop (SNTP, etc)
					debugIt("Created new connection to " + SSID); 
					runOperations(-10);
					}
				);
				fWIFIChange = true;
		}
		else if(oState.station === "connected")
		{
			debugIt("Already connected");
			runOperations(1000);
		}
		if(oState.ap === "enabled")
		{
			WIFI.stopAP();		//needed for memory reasons!
			fWIFIChange = true;
		}
		if(fWIFIChange)
		{
			WIFI.setSNTP('us.pool.ntp.org', -5);
			WIFI.save();
		}
	}
}

function sleepController()
{
	//switch to control if wifi is totally disconnected
	if(digitalRead(D13)===0)
	{
		debugIt("turning off wifi!");
		WIFI.disconnect();
	}
}

//assume already have connection, or burn!
function runOperations(nFactor)
{
	debugIt("running operations");
	pingSite();
	postToThingsSpeak(nFactor);
	setTimeout(sleepController, NMILIPERMIN);	//sleep a minute, before considering turning off the wifi connection
}
//http://api.thingspeak.com/update?key=XXXSTG7J8W0DYXXX&field1=93.44&created_at=2012-06-05%2000:15:00
function postToThingsSpeak(nFactor)
{
	var sURL = THINGSPEAKURL + "?key=" + sThingspeakKey + "&field1=" + getSolarValue(nFactor);
	debugIt("calling URL" + sURL);
	HTTP.get(sURL, function(res) 
	{
		res.on('data', function(sdta) { debugIt("Response:" + sdta);});
		res.on('close', function(fLoaded) { debugIt("closed connection"); });
	});
}

function getSolarValue(nFactor)
{
	digitalWrite(D4,1);	//turn on the solar resistor
	var nVal = (1-analogRead(ANALOGPIN))*nFactor;
	digitalWrite(D4,0); //turn off the solar resistor
	return round2(nVal);
}

function debugIt(sString)
{
	var sDate = dateString(new Date());
	console.log(sDate + ">" + sString);
}

function pingSite()
{
	var sSite = 'http://cloudservices-willcode.rhcloud.com/';
	HTTP.get(sSite, function(res) 
	{
		res.on('data', function(sdta) { });
		res.on('close', function(fLoaded) {});
	});
}

 function round2(nNum)
 {
	return Math.round(nNum * 100)/100;
 }
function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
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

//onInit();