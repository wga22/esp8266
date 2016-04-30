/*
	Title / Purpose: create a wifi connection from a station
	Author: Will.allen%%gmail.com
	TODO: 
		rename global variables (or put into a hashmap?)
		implement reset / deepsleep?
	Created: April 2016
	Modified:
	REQUIRED:  Must have set all wifi properties manually on your Esprunio (tested on version 1.84)
	
	Need to setup access point
	
	https://github.com/espruino/Espruino/wiki/Generic-WiFi-Design
	http://www.espruino.com/ESP8266_WifiUsage
	
	//var WIFI = require("Wifi");
	WIFI.getAPDetails();
	WIFI.startAP("will", {password:"password", authMode:"wpa2", savedSsid:"will"});
	WIFI.getAPIP();
	WIFI.startAP("landscape");	//open, no password needed
	WIFI.scan(function(s){console.log(s)});
	
	//var HTTP = require("http");
	//var ESP8266 = require("ESP8266");
	//var WIFI = require("Wifi");
	WIFI.getAPDetails();
	WIFI.startAP("will", {password:"password", authMode:"wpa2", savedSsid:"will"});
	WIFI.getAPIP();

	//https://github.com/tzapu/WiFiManager

var HTTP = require("http");
var ESP8266 = require("ESP8266");
var WIFI = require("Wifi");	

*/


var HTTP_HEAD         = "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><link rel=\"icon\" type=\"image/png\" href=\"http://i.imgur.com/87R4ig5.png\">";
var HTTP_STYLE         = "<style>.c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>";
var HTTP_SCRIPT       = "<script>function c(l){document.getElementById('s').value=l.innerText||l.textContent;document.getElementById('p').focus();}</script>";
var HTTP_HEAD_END        = "</head><body><div style='text-align:left;display:inline-block;min-width:260px;'>";
var HTTP_PORTAL_OPTIONS  = "<form action=\"/wifi\" method=\"get\"><button>Configure WiFi</button></form><br/><form action=\"/0wifi\" method=\"get\"><button>Configure WiFi (No Scan)</button></form><br/><form action=\"/i\" method=\"get\"><button>Info</button></form><br/><form action=\"/r\" method=\"post\"><button>Reset</button></form>";
var HTTP_ITEM          = "<div><a href='#p' onclick='c(this)'>{v}</a>&nbsp;<span class='q {i}'>{r}%</span></div>";
var HTTP_FORM_START    = "<form method='get' action='wifisave'><input id='s' name='s' length=32 placeholder='SSID'><br/><input id='p' name='p' length=64 type='password' placeholder='password'><br/>";
var HTTP_FORM_PARAM     = "<br/><input id='{i}' name='{n}' length={l} placeholder='{p}' value='{v}' {c}>";
var HTTP_FORM_END      = "<br/><button type='submit'>save</button></form>";
var HTTP_SCAN_LINK      = "<br/><div class=\"c\"><a href=\"/wifi\">Scan</a></div>";
var HTTP_SAVED         = "<div>Credentials Saved<br />Trying to connect ESP to network.<br />If it fails reconnect to AP to try again</div>";
var HTTP_END          = "</div></body></html>";

var nPageLoads = 0;
var STITLE = "Landscape Timer by Will Allen";
var sVersion = 'V1 2016-04-30';
var nMilisPerHour = 3600000;

function onInit()
{
	//not needed setSnTP();	//set the time server (not actually used?)
	setTimeout(startWebserver, 5000);
	ESP8266.setCPUFreq(80);	//save power?
}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);  
}

//event for webserver
function getPage(req,res) 
{
	var hostip = WIFI.getIP().ip;
	console.log("URL requested: " + req.url);
	//console.log("host ip: " + hostip);
	var oUrl = url.parse(req.url, true);
	nPageLoads++;
	
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(HTTP_HEAD);
	res.write(HTTP_STYLE);
	res.write(HTTP_SCRIPT);
	res.write('<title>'+STITLE+'</title>');
	res.write(HTTP_HEAD_END);
	
	res.write("<h2>Welcome to "+STITLE+" ("+sVersion+")</h2>");
	res.write("<ul>");
	res.write( '<li><b>System time</b>: ' + dateString(new Date()));
	//res.write( '<li><b>Host</b>:' + hostip);
	//res.write( '<li><b>Path</b>:' + req.path);

	//we must be connected via access point
	if( hostip == '0.0.0.0')
	{
		if(oUrl && oUrl.query && oUrl.query.s && oUrl.query.p)
		{
			console.log("attempting to connect to " + oUrl.query.s);
			res.write("<li>Connecting to " + oUrl.query.s+"</li>");
			//res.write("<li>"+oUrl.query.p+"</li>");
			//WIFI.connect(oUrl.query.s, {password:oUrl.query.p}, function(ap){ console.log("connected:"+ ap);});
			//WIFI.save();
			try
			{
				//WIFI.connect(oUrl.query.s, {password:oUrl.query.p}, function(ap){ console.log("connected:"+ ap); WIFI.save();});
				WIFI.connect(oUrl.query.s, {password:oUrl.query.p}, function(ap){ console.log("connected:"); WIFI.save();});
				res.write("<li>successfully connected!</li>");				
			}
			catch(e)
			{
				res.write("<li>failed to connect to: "+oUrl.query.s+"</li>");
				console.log("failed to connect:" +e);
			}
			res.write("</ul>");
		}
		else  //write out the form for the SSID and password
		{
			res.write("</ul>");
			res.write(HTTP_FORM_START);
			res.write(HTTP_FORM_END);
		}		
	}
	else
	{
		
		res.write( '<li><b>System time</b>: ' + dateString(new Date()));
		res.write( '<li><b>Host</b>:' + hostip);
		res.write( '<li><b>port</b>:' + req.port);
		res.write( '<li><b>Path</b>:' + req.path);
		res.write("</ul>");
		var sTable = ( '<table style="width:90%"><tr>');
		sTable += ( '<td><button type="button" onclick="document.location=\'/on\'">Lights On</button></td>');
		sTable += ( '<td><button type="button" onclick="document.location=\'/off\'">Lights Off</button></td>');
		sTable += ( '<td><button type="button" onclick="document.location=\'/toggle\'">Toggle</button></td>');
		sTable += ( '<td><button type="button" onclick="document.location=\'/status\'">Status</button></td>');
		sTable += ( '</tr></table>');
		res.write(sTable);
	}
	res.write(HTTP_END);
	res.end();
}

onInit();

/*
function setSnTP()
{
	var sHost = 'us.pool.ntp.org';
	console.log("set SNTP:" + sHost);
	WIFI.setSNTP(sHost, -5);
	setTimeout(setBootTime, 5000);
}
*/

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
