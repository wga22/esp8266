// Plot DTH11 data on thingspeak.com using an ESP8266 
//add an LCD http://imaginen4tion.blogspot.com/2015/10/how-to-connect-esp8266-to-lcd-via-i2c.html
// July 11 2015
// Author: Will Allen
/*
REF sites:
--good sample code for using SSL
https://github.com/cottsak/opensesameseed/blob/master/iforgottocloseit/iforgottocloseit.ino

--wunderground code
http://thisoldgeek.blogspot.com/2015/01/esp8266-weather-display.html

www.arduinesp.com 
*/
#include <DHT.h>
#include <ESP8266WiFi.h>
#define DHTPIN 2 // what pin we're connected to

//keys.h to include: WIFI_SSID, WIFI_PASSWORD, WUNDERGROUNDKEY
#include <keys.h>
#include "user_interface.h"


// replace with your channel's thingspeak API key, 
// http://api.wunderground.com/api/13db05c35598dd93/conditions/q/Australia/Sydney.json
const int buffer=300;
const char* thingspeakapi = "api.thingspeak.com";

bool resetWifiEachTime = true;
bool fTesting =false;     //turns off need for DHT11
bool fDeepSleep = true;

DHT dht(DHTPIN, DHT11, 20);
WiFiClient client;
unsigned long sleepPerLoopSeconds = 60*60;  //60 seconds X 60 minutes = 1 hr   
//int sleepPerLoopMilliSeconds = 60*1000*1;  //1 min   
String STATUSSTR="2015-11-16";
String statusOut = "";

void setup() 
{ 
	Serial.begin(115200);
	Serial.println("waiting for power to stabilize - 30 secs");
	delay(.5*1000*60);  //30 seconds

	//delay(0.1*1000*60);  //.1 mins
	dht.begin();
	if (!resetWifiEachTime || fDeepSleep)
	{
		startWifi();
	}
}

void loop() 
{
	if(resetWifiEachTime && !fDeepSleep)
	{
		startWifi();   
	}
	statusOut = STATUSSTR;
	//call this site each hour to keep it from idling
	callCloudSite();
	
	callThingSpeak();

	client.stop();

	if(resetWifiEachTime && !fDeepSleep)
	{
		WiFi.disconnect();
	}
	// thingspeak needs minimum 15 sec delay between updates
	if(fDeepSleep)
	{
		Serial.print("deep sleeping for (mins)");
		Serial.println((sleepPerLoopSeconds/(60)));		
		//system_deep_sleep_set_option(0);
		//system_deep_sleep(sleepPerLoop * 1000);	//for some reason the deepsleep is in ms?	
		//delay(sleepPerLoop);
		// deepSleep time is defined in microseconds. Multiply
		// seconds by 10^6 
		ESP.deepSleep(sleepPerLoopSeconds * 1000 * 1000);
	}
	else
	{
		Serial.print("DELAY for (mins)");
		Serial.println((sleepPerLoopSeconds/(60)));		
		delay(sleepPerLoopSeconds * 1000);
	}
}

void callThingSpeak()
{
	//set vars
	String postStr = THINGSPEAK_API;

	//get inputs
	String viennaTemp = getInternetTemp();
	float h = dht.readHumidity();
	float t = dht.readTemperature(true);
	
	//verify data
	if(isnan(t))
	{
		Serial.println("Failed to read from DHT sensor (temp)!");
		statusOut += "_errT";
	}
	else
	{
		Serial.print("Temperature(f): ");
		Serial.println(t);
		postStr +="&field1=";
		postStr += String(t);
	}

	if (isnan(h)) 
	{
		Serial.println("Failed to read from DHT sensor(humidity)!");
		statusOut += "_errH";
	}
	else
	{
		Serial.print("Humidity(%): "); 
		Serial.println(h);
		postStr +="&field2=";
		postStr += String(h);
	}

	if(viennaTemp!="-100")
	{
		postStr += "&field3=";
		postStr += viennaTemp;
		Serial.print("Temperature(f) in Vienna: ");
		Serial.println(viennaTemp);
	}

	//write/post data to thingspeak
	if (client.connect(thingspeakapi,80)) 
	{  //   "184.106.153.149" or api.thingspeak.com
		statusOut += "_tp";
		postStr += "&status=";
		postStr += statusOut;
		postStr += "\r\n\r\n";

		client.print("POST /update HTTP/1.1\n"); 
		client.print("Host: api.thingspeak.com\n"); 
		client.print("Connection: close\n"); 
		client.print("X-THINGSPEAKAPIKEY: ");
		client.print(THINGSPEAK_API); 
		client.print("\nContent-Type: application/x-www-form-urlencoded\n"); 
		client.print("Content-Length: "); 
		client.print(postStr.length()); 
		client.print("\n\n"); 
		client.print(postStr);

		Serial.println("Send to Thingspeak");
	}
}

void turnOff(int pin) 
{
  pinMode(pin, OUTPUT);
  digitalWrite(pin, 1);
}

void startWifi()
{
	delay(1000);
	Serial.println();
	Serial.println();
	Serial.print("Connecting to ");
	Serial.println(WIFI_SSID);

	WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

	while (WiFi.status() != WL_CONNECTED) 
	{
		delay(500);
		Serial.print(".");
	}
	Serial.println("");
	Serial.println("WiFi connected");
}

String getInternetTemp()
{
	//http://thisoldgeek.blogspot.com/2015/01/esp8266-weather-display.html
	//http://api.wunderground.com/api/13db05c35598dd93/conditions/q/va/vienna.json
	//wundergroundKey
	// Array of desired weather conditions 
	// These must be in the order received from wunderground!
	//
	// Also, watch out for repeating field names in returned json structures, 
	//  and fields with embedded commas (used as delimiters)

	int passNum = 1;
	String out = "-100";	//since -1 is possible
	const char* wunderground = "api.wunderground.com";	//string wont work
	if (client.connect(wunderground, 80)) 
	{
		Serial.println("connected to wunderground");
		client.print("GET /api/");
		client.print(WUNDERGROUNDKEY);
		client.println("/conditions/q/va/vienna.json HTTP/1.1");
		client.println("Host: api.wunderground.com");
		client.println("Connection: close");
		client.println();

		//Wait up to 10 seconds for server to respond then read response
		int pp=0;
		while((!client.available()) && (pp<500))
		{
			delay(20);
			pp++;
		}
		if(pp==500)
		{
			Serial.println("there was an issue pulling from the stream");
		}
		const char* fieldName = "\"temp_f\":";		//string wont work
		Serial.print("looking for: ");
		Serial.println(fieldName);
		int x = 2000;  //limit tries
		for(; !client.find(fieldName) && x>0; x--){} // find the part we are interested in.
		if(x==0) 
		{
			Serial.println("we never found the field");
		}
		else
		{
			out="";
			int i=0;
			while (i<6000) 
			{
				if(client.available()) 
				{
					char c = client.read();    
					if(c==',') 
					{
						break;
					}
					out+=c;
					i=0;
				}
				i++;
			}
		}
		Serial.println("finished reading");
	// if the server's disconnected, stop the client:
		if (!client.connected()) 
		{
			Serial.println();
			Serial.println("disconnecting from server.");
			client.stop();
		}
	}
	Serial.print("out: ");
	Serial.println(out);
	statusOut += "_wu";
	return out;
}


void callCloudSite()
{
	//in order to keep openshift.com site from idling, must call it 1x (at least) a day
	
	/*
	GET /tutorials/other/top-20-mysql-best-practices/ HTTP/1.1
	Host: net.tutsplus.com
	User-Agent: Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.5) Gecko/20091102 Firefox/3.5.5 (.NET CLR 3.5.30729)
	Accept: text/html,application/xhtml+xml,application/xml;q=0.9,;q=0.8
	Accept-Language: en-us,en;q=0.5
	Accept-Encoding: gzip,deflate
	Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7
	Keep-Alive: 300
	Connection: keep-alive
	Cookie: PHPSESSID=r2t5uvjq435r4q7ib3vtdjq120
	Pragma: no-cache
	Cache-Control: no-cache
*/
	
	
	const char* cloudurl = "cloudservices-willcode.rhcloud.com";	//string wont work
	if (client.connect(cloudurl, 80)) 
	{
		Serial.print("connected to ");
		Serial.println(cloudurl);
		client.println("GET / HTTP/1.1");
		client.print("Host: ");
		client.println(cloudurl);
		client.println("User-Agent: Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.5) Gecko/20091102 Firefox/3.5.5 (.NET CLR 3.5.30729)");
		client.println("Connection: close");
		client.println();

		//Wait up to 50 seconds for server to respond then read response
		int pp=0;
		while((!client.available()) && (pp<50))
		{
			delay(1000);
			pp++;
		}
		if(pp==50)
		{
			Serial.println("there was an issue pulling from the stream");
			statusOut+="_errcp";
		}
		int i=0;
		while (i<6000) 
		{
			if(client.available()) 
			{
				char c = client.read();    
			}
			i++;
		}
		Serial.println("finished reading");
	// if the server's disconnected, stop the client:
		if (!client.connected()) 
		{
			Serial.println();
			Serial.println("disconnecting from server.");
			client.stop();
		}
	}
	statusOut += "_cl";
	Serial.println("out: finished reading");
	Serial.println(cloudurl);
	return;
}
