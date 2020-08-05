// Plot DTH11 data on thingspeak.com using an ESP8266 
// July 11 2015
// Author: Will Allen
// www.arduinesp.com 
#include <DHT.h>
#include <ESP8266WiFi.h>
#define DHTPIN 2 // what pin we're connected to
 
// replace with your channel's thingspeak API key, 
// http://api.wunderground.com/api/13db05c35598dd93/conditions/q/Australia/Sydney.json
String apiKey = "NK6HEWTA7BC9ANLD";
String wundergroundKey = "13db05c35598dd93";
#ifdef WIFI1_S
const char* ssid = WIFI1_S;
const char* password =WIFI1_P;
#endif
const int buffer=300;
const char* server = "api.thingspeak.com";

bool resetWifiEachTime = true;
bool fTesting =false;     //turns off need for DHT11

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

void startWifi()
{
	delay(1000);
	Serial.println();
	Serial.println();
	Serial.print("Connecting to ");
	Serial.println(ssid);

	WiFi.begin(ssid, password);

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
  String out = "-1";
  String wunderground = "api.wunderground.com";
  if (client.connect(wunderground, 80)) 
  {
    Serial.println("connected to wunderground");
    client.println("GET /api/13db05c35598dd93/conditions/q/va/vienna.json HTTP/1.1");
    client.println("Host: api.wunderground.com");
    client.println("Connection: close");
    client.println();
 
     //Wait up to 10 seconds for server to respond then read response
    int pp=0;
    while((!client.available()) && (pp<500)){
      delay(20);
      pp++;
    }
    if(pp==500)
      Serial.println("there was an issue pulling from the stream");
 
    String fieldName = "\"temp_f\":";
    Serial.print("looking for: ");
    Serial.println(fieldName);
    int x = 2000;  //limit tries
    for(; !client.find(fieldName) && x>0; x--){} // find the part we are interested in.
    if(x==0) {Serial.println("we never found the field");}
    else{
    out="";
    int i=0;
    while (i<6000) 
    {
      if(client.available()) 
      {
        char c = client.read();    
        if(c==',') break;
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

void loop() {
  if(resetWifiEachTime){
    startWifi();   
  }
  float h = dht.readHumidity();
  float t = dht.readTemperature(true);
  if (isnan(h) || isnan(t)) {
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
 
  if (client.connect(server,80)) {  //   "184.106.153.149" or api.thingspeak.com
    String postStr = apiKey;
           postStr +="&field1=";
           postStr += String(t);
           postStr +="&field2=";
           postStr += String(h);
    if(viennaTemp!="-1")
    {
           postStr += "&field3=";
           postStr += viennaTemp;
    }
           postStr += "\r\n\r\n";
 
     client.print("POST /update HTTP/1.1\n"); 
     client.print("Host: api.thingspeak.com\n"); 
     client.print("Connection: close\n"); 
     client.print("X-THINGSPEAKAPIKEY: "+apiKey+"\n"); 
     client.print("Content-Type: application/x-www-form-urlencoded\n"); 
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
  delay(sleepPerLoop);  
}




{
  "response": 
  {
	  "version":"0.1",
	  "termsofService":"http://www.wunderground.com/weather/api/d/terms.html",
	  "features": {	  "astronomy": 1  }
  }
  ,	"moon_phase": 
	{
		"percentIlluminated":"4",
		"ageOfMoon":"28",
		"phaseofMoon":"Waning Crescent",
		"hemisphere":"North",
		"current_time": {
		"hour":"17",
		"minute":"41"
		},
		"sunrise": {
		"hour":"6",
		"minute":"46"
		},
		"sunset": {
		"hour":"19",
		"minute":"36"
		},
		"moonrise": {
		"hour":"5",
		"minute":"40"
		},
		"moonset": {
		"hour":"17",
		"minute":"42"
		}
	},
	"sun_phase": {
		"sunrise": {
		"hour":"6",
		"minute":"46"
		},
		"sunset": {
		"hour":"19",
		"minute":"36"
		}
	}
}
