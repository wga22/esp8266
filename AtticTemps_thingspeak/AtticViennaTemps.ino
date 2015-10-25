// Plot DTH11 data on thingspeak.com using an ESP8266 
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
const char* server = "api.thingspeak.com";

bool resetWifiEachTime = true;
bool fTesting =false;     //turns off need for DHT11
bool fDeepSleep = false;

DHT dht(DHTPIN, DHT11,20);
WiFiClient client;
int sleepPerLoop = 60*1000*60;  //1 hr   
 
void setup() 
{ 
	Serial.begin(115200);
	if(fTesting)
	{
		Serial.println("waiting for power to stabilize - 30 secs");
		delay(.5*1000*60);  //5 mins
	}
	else
	{
		Serial.println("waiting for power to stabilize - 5 mins");
		delay(5*1000*60);  //5 mins
	}
	//delay(0.1*1000*60);  //.1 mins
	dht.begin();
	if (!resetWifiEachTime) 
	{
		startWifi();
	}
}

void loop() 
{
	if(resetWifiEachTime)
	{
		startWifi();   
	}
	float h = dht.readHumidity();
	float t = dht.readTemperature(true);
	if (isnan(h) || isnan(t)) 
	{
		Serial.println("Failed to read from DHT sensor!");
		if(fTesting)
		{
			h=0;
			t=0;
		}
		else
		{
			Serial.println("Failed to read from DHT sensor! - aborting loop");
			return;
		}
	}
	String viennaTemp = getInternetTemp();
	if (client.connect(server,80)) 
	{  //   "184.106.153.149" or api.thingspeak.com
		String postStr = THINGSPEAK_API;
		postStr +="&field1=";
		postStr += String(t);
		postStr +="&field2=";
		postStr += String(h);
		if(viennaTemp!="-100")
		{
			postStr += "&field3=";
			postStr += viennaTemp;
		}
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

		Serial.print("Temperature: ");
		Serial.print(t);
		Serial.print(" degrees fahrenheit Humidity: "); 
		Serial.print(h);
		Serial.print(" internet temp: "); 
		Serial.print(viennaTemp);
		Serial.println("% send to Thingspeak");
	}
	client.stop();
	if(resetWifiEachTime)
	{
		WiFi.disconnect();
	}
	Serial.println("Waiting...");    
	// thingspeak needs minimum 15 sec delay between updates
	if(fDeepSleep)
	{
		//system_deep_sleep_set_option(0);
		//system_deep_sleep(sleepPerLoop * 1000);	//for some reason the deepsleep is in ms?	
		delay(sleepPerLoop);
	}
	else
	{
		delay(sleepPerLoop);
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
	return out;
}