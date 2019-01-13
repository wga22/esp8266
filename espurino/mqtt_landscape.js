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

//Global requires
const HTTP = require("http");
const WIFI = require("Wifi");
const ESP8266 = require("ESP8266");
const flash = require("Flash");


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

  var server = "192.168.1.10"; // the ip of your MQTT broker
  var options = { // ALL OPTIONAL - the defaults are below
    client_id : "random",   // the client ID sent to MQTT - it's a good idea to define your own static one based on `getSerial()`
    keep_alive: 60,         // keep alive time in seconds
    port: 1883,             // port number
    clean_session: true,
    username: "username",   // default is undefined
    password: "password",   // default is undefined
    protocol_name: "MQTT",  // or MQIsdp, etc..
    protocol_level: 4,      // protocol level
  };
  var mqtt = require("MQTT").create(server, options /*optional*/);

  mqtt.on('connected', function() {
    mqtt.subscribe("test");
  });

  mqtt.on('publish', function (pub) {
    console.log("topic: "+pub.topic);
    console.log("message: "+pub.message);
  });


  var wlan = require("CC3000").connect();
  wlan.connect( "AccessPointName", "WPA2key", function (s) {
    if (s=="dhcp") {
      console.log("My IP is "+wlan.getIP().ip);
      mqtt.connect();
    }
  });