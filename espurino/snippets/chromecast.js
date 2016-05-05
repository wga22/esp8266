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
	
	//var wifi = require("Wifi");
wifi.getAPDetails();
wifi.startAP("will", {password:"password", authMode:"wpa2", savedSsid:"will"});
wifi.getAPIP();
	wifi.startAP("landscape");	//open, no password needed
	wifi.scan(function(s){console.log(s)});
	
	//var HTTP = require("http");
//var ESP8266 = require("ESP8266");
//var wifi = require("Wifi");
WIFI.getAPDetails();
WIFI.startAP("will", {password:"password", authMode:"wpa2", savedSsid:"will"});
WIFI.getAPIP();

//https://github.com/tzapu/WiFiManager

*/

var HTTP = require("http");
var WIFI = require("Wifi");

//////////////////////////NEW CODE FROM WIFIMANAGER
function wifiManager()
{
	var HTTP_200            = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n";
	var HTTP_HEAD         = "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, user-scalable=no\"/><title>{v}</title>";
	var HTTP_STYLE         = "<style>.c{text-align: center;} div,input{padding:5px;font-size:1em;} input{width:95%;} body{text-align: center;font-family:verdana;} button{border:0;border-radius:0.3rem;background-color:#1fa3ec;color:#fff;line-height:2.4rem;font-size:1.2rem;width:100%;} .q{float: right;width: 64px;text-align: right;} .l{background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==\") no-repeat left center;background-size: 1em;}</style>";
	var HTTP_SCRIPT       = "<script>function c(l){document.getElementById('s').value=l.innerText||l.textContent;document.getElementById('p').focus();}</script>";
	var HTTP_HEAD_END        = "</head><body><div style='text-align:left;display:inline-block;min-width:260px;'>";
	var HTTP_PORTAL_OPTIONS  = "<form action=\"/wifi\" method=\"get\"><button>Configure WiFi</button></form><br/><form action=\"/0wifi\" method=\"get\"><button>Configure WiFi (No Scan)</button></form><br/><form action=\"/i\" method=\"get\"><button>Info</button></form><br/><form action=\"/r\" method=\"post\"><button>Reset</button></form>";
	var HTTP_ITEM          = "<div><a href='#p' onclick='c(this)'>{v}</a>&nbsp;<span class='q {i}'>{r}%</span></div>";
	//var HTTP_ITEM_PADLOCK[] PROGMEM = "<img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAALVBMVEX///8EBwfBwsLw8PAzNjaCg4NTVVUjJiZDRUUUFxdiZGSho6OSk5Pg4eFydHTCjaf3AAAAZElEQVQ4je2NSw7AIAhEBamKn97/uMXEGBvozkWb9C2Zx4xzWykBhFAeYp9gkLyZE0zIMno9n4g19hmdY39scwqVkOXaxph0ZCXQcqxSpgQpONa59wkRDOL93eAXvimwlbPbwwVAegLS1HGfZAAAAABJRU5ErkJggg==' width='13px'/>";
	var HTTP_FORM_START    = "<form method='get' action='wifisave'><input id='s' name='s' length=32 placeholder='SSID'><br/><input id='p' name='p' length=64 type='password' placeholder='password'><br/>";
	var HTTP_FORM_PARAM     = "<br/><input id='{i}' name='{n}' length={l} placeholder='{p}' value='{v}' {c}>";
	var HTTP_FORM_END      = "<br/><button type='submit'>save</button></form>";
	var HTTP_SCAN_LINK      = "<br/><div class=\"c\"><a href=\"/wifi\">Scan</a></div>";
	var HTTP_SAVED         = "<div>Credentials Saved<br />Trying to connect ESP to network.<br />If it fails reconnect to AP to try again</div>";
	var HTTP_END          = "</div></body></html>";
	
	this.autoConnect = _autoConnect;
	function _autoConnect(sSSIDName)
	{
		sSSIDName = sSSIDName ? sSSIDName : "IOTDevice";
		return startConfigPortal(sSSIDName);
	}
	function startConfigPortal()
	{
		setupConfigPortal();
	}
	
	function getSignupPage()
	
	function setupConfigPortal()
	{
		HTTP.createServer(getSignupPage).listen(80);
	  dnsServer.reset(new DNSServer());
	  server.reset(new ESP8266WebServer(80));

	  DEBUG_WM(F(""));
	  _configPortalStart = millis();

	  DEBUG_WM(F("Configuring access point... "));
	  DEBUG_WM(_apName);
	  if (_apPassword != NULL) {
		if (strlen(_apPassword) < 8 || strlen(_apPassword) > 63) {
		  // fail passphrase to short or long!
		  DEBUG_WM(F("Invalid AccessPoint password. Ignoring"));
		  _apPassword = NULL;
		}
		DEBUG_WM(_apPassword);
	  }

	  //optional soft ip config
	  if (_ap_static_ip) {
		DEBUG_WM(F("Custom AP IP/GW/Subnet"));
		WiFi.softAPConfig(_ap_static_ip, _ap_static_gw, _ap_static_sn);
	  }

	  if (_apPassword != NULL) {
		WiFi.softAP(_apName, _apPassword);//password option
	  } else {
		WiFi.softAP(_apName);
	  }

	  delay(500); // Without delay I've seen the IP address blank
	  DEBUG_WM(F("AP IP address: "));
	  DEBUG_WM(WiFi.softAPIP());

	  /* Setup the DNS server redirecting all the domains to the apIP */
	  dnsServer->setErrorReplyCode(DNSReplyCode::NoError);
	  dnsServer->start(DNS_PORT, "*", WiFi.softAPIP());

	  /* Setup web pages: root, wifi config pages, SO captive portal detectors and not found. */
	  server->on("/", std::bind(&WiFiManager::handleRoot, this));
	  server->on("/wifi", std::bind(&WiFiManager::handleWifi, this, true));
	  server->on("/0wifi", std::bind(&WiFiManager::handleWifi, this, false));
	  server->on("/wifisave", std::bind(&WiFiManager::handleWifiSave, this));
	  server->on("/i", std::bind(&WiFiManager::handleInfo, this));
	  server->on("/r", std::bind(&WiFiManager::handleReset, this));
	  server->on("/generate_204", std::bind(&WiFiManager::handle204, this));  //Android/Chrome OS captive portal check.
	  server->on("/fwlink", std::bind(&WiFiManager::handleRoot, this));  //Microsoft captive portal. Maybe not needed. Might be handled by notFound handler.
	  server->onNotFound (std::bind(&WiFiManager::handleNotFound, this));
	  server->begin(); // Web server start
	  DEBUG_WM(F("HTTP server started"));
	
	}
	
	
	wifiManager
	WiFi.mode(WIFI_STA);
	
}


//create the connection
wifiManager.autoConnect("LANDSCAPE");

//whne you have config
wifiManager.setSaveConfigCallback(saveConfigCallback);






/////////////////////////////////////OLD CODE
var nPageLoads = 0;
var sVersion = 'V1 (2016-04-22) - by Will Allen';
var nMilisPerHour = 3600000;
var HTTP = require("http");
var ESP8266 = require("ESP8266");
//var WIFI = require("Wifi");

function onInit()
{
	//not needed setSnTP();	//set the time server (not actually used?)
	setTimeout(startWebserver, 5000);

}

function startWebserver()
{
  console.log("startWebserver");
  HTTP.createServer(getPage).listen(80);  
}

function dateString(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate()) + " " + (a_dDate.getHours()) + ":" + (fixMinutes(a_dDate.getMinutes()));
}

//event for webserver
function getPage(req,res) 
{
	console.log("URL requested: " + req.url);
	nPageLoads++;
	if(req.url ==  "/reset")
	{
	}
	var sContent = "<h2>Welcome to landscape light timer ("+sVersion+")</h2>";
	sContent +="<ul>";
	sContent += '<li><b>System time</b>: ' + dateString(new Date());
	sContent += '<li><b>Status</b>:' + sMode;

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

