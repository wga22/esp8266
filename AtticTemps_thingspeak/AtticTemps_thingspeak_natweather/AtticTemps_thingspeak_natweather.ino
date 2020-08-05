// Plot DTH11 data on thingspeak.com using an ESP8266 
// July 11 2015
// Author: Will Allen
// www.arduinesp.com 
#include <DHT.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <wificredentials.h>
#define DHTPIN 2 // what pin we're connected to
 
// replace with your channel's thingspeak API key, 
// http://api.wunderground.com/api/13db05c35598dd93/conditions/q/Australia/Sydney.json
String apiKey = "NK6HEWTA7BC9ANLD";
String wundergroundKey = "13db05c35598dd93";
//make sure you at least have a WIFI1 in your credentials file
#ifdef WIFI1_S
const char* ssid = WIFI1_S;
const char* password =WIFI1_P;
#endif
const int buffer=300;
const char* server = "api.thingspeak.com";
const char fingerprint[] PROGMEM = "fingerprint";
const int httpsPort = 443;

WiFiClientSecure sslClient;



bool resetWifiEachTime = true;
bool fTesting =false;     //turns off need for DHT11

DHT dht(DHTPIN, DHT11,20);
int sleepPerLoop = 60*1000*60;  //1 hr   
 
void setup() 
{ 
	Serial.begin(115200);
	Serial.println("waiting for power to stabilize - 30 secs");
	delay(1000*10);  //10 secs
  //sslClient.setFingerprint(fingerprint);
  sslClient.setInsecure();
	dht.begin();
}

void loop() 
{
  startWifi();   
  //get temp data
  float h = dht.readHumidity();
  float t = dht.readTemperature(true);
  if (isnan(h) || isnan(t)) 
  {
    Serial.println("Failed to read from DHT sensor!");
  }

  //get local weather data
  Serial.println("get internet temp");
  String viennaTemp = getInternetTemp();

  //write out the data
  Serial.println("writeThingSpeak");
  writeThingSpeak(t,h, viennaTemp);
  WiFi.disconnect();
  Serial.print("End of loop...sleeping (mins) ");
  Serial.println(sleepPerLoop/60000);    
  delay(sleepPerLoop);
  // thingspeak needs minimum 15 sec delay between updates  
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
  String out = "-1";
  String willcloud = "willcloud.crabdance.com";
  //http://willcloud.crabdance.com/temp.php
  //https://www.theamplituhedron.com/articles/How-to-connect-to-an-SSL-protected-server-with-ESP8266(WiFiClient)/
  Serial.println("WiFiClientSecure");
  Serial.println("setFingerprint");
  
  if (sslClient.connect(willcloud, httpsPort)) 
  {
    Serial.println("connected to willcloud");
    sslClient.println("GET /temp.php HTTP/1.1");
    sslClient.println("Host: " + willcloud);
    sslClient.println("Connection: close");
    sslClient.println();
 
     //Wait up to 10 seconds for server to respond then read response
    int pp=0;
    for(pp=0; (!sslClient.available()) && (pp<500); pp++)
    {
      delay(20);
    }
    if(pp==500)
    {
      Serial.println("there was an issue pulling from the stream");
      return out;
    }
    out="";
    int x = 2000;  //limit tries
    for(; !sslClient.find("temp:") && x>0; x--){} // find the part we are interested in.
    for(pp=0; (sslClient.available()  && (pp < 1000)); pp++) 
    {
      char c = sslClient.read();    
      if(c==-1)
      {
       Serial.println("end of string found");
        break;
      }
      out+=c;
    }
    Serial.print("finished reading: ");
    Serial.println(out);
    sslClient.stop();
  }
   else
  {
    Serial.print("didnt connect to ");
    Serial.println(willcloud);
    
  }

  return out;
}


void writeThingSpeak(float temp, float humid, String vTemp )
{
   if (!fTesting && sslClient.connect(server,httpsPort)) 
  {  //   "184.106.153.149" or api.thingspeak.com
    String postStr = apiKey;
           postStr +="&field1=";
           postStr += String(temp);
           postStr +="&field2=";
           postStr += String(humid);
    if(vTemp!="-1")
    {
      Serial.println("vienna temp there.");
      postStr += "&field3=";
      postStr += vTemp;
    }
    postStr += "\r\n\r\n";
 
     sslClient.print("POST /update HTTP/1.1\n"); 
     sslClient.print("Host: api.thingspeak.com\n"); 
     sslClient.print("Connection: close\n"); 
     sslClient.print("X-THINGSPEAKAPIKEY: "+apiKey+"\n"); 
     sslClient.print("Content-Type: application/x-www-form-urlencoded\n"); 
     sslClient.print("Content-Length: "); 
     sslClient.print(postStr.length()); 
     sslClient.print("\n\n"); 
     sslClient.print(postStr);

     Serial.println(postStr);
           
 
     Serial.print("Temperature: ");
     Serial.print(humid);
     Serial.print(" degrees fahrenheit Humidity: "); 
     Serial.print(humid);
     Serial.print(" internet temp: "); 
     Serial.print(vTemp);
     Serial.println("% send to Thingspeak");
  }
  else
  {
    Serial.print("didnt connect to ");
    Serial.println(server);
  }
  sslClient.stop();
}
