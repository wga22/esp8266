 // Plot DTH11 data on thingspeak.com using an ESP8266 
// July 11 2015
// Author: Will Allen
// www.arduinesp.com 
#include <DHT.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <wifi_credentials.h>
#include "ThingSpeak.h"
#define DHTPIN D4
 
// replace with your channel's thingspeak API key, 
// http://api.wunderground.com/api/13db05c35598dd93/conditions/q/Australia/Sydney.json

const char * TP_APPLE = "NK6HEWTA7BC9ANLD";
const unsigned long TP_CHANNEL = 39741;


String apiKey = "NK6HEWTA7BC9ANLD";
String wundergroundKey = "13db05c35598dd93";
const int buffer=300;
const char* server = "api.thingspeak.com";
const char fingerprint[] PROGMEM = "fingerprint";
const int httpsPort = 443;
const int SERIALRATE = 19200;

WiFiClientSecure sslClient;
WiFiClient wifiClient;
ESP8266WiFiMulti WiFiMulti;

bool resetWifiEachTime = true;
//bool fTesting =false;     //turns off need for DHT11

int sleepPerLoop = 60*1000*60;  //1 hr   
 
void setup() 
{ 
}

void loop() 
{
  //setup, assume deepsleep requires reset, so "setup" also run each time, but be sure.
  pinMode(D0, WAKEUP_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.mode(WIFI_STA);
  Serial.begin(SERIALRATE);
  Serial.println("waiting for power to stabilize");
  blinkLED(-1);
  delay(1000*3);  //3 secs
  //sslClient.setFingerprint(fingerprint);
  sslClient.setInsecure();
  blinkLED(-1);
  setupWIFI();

  startWIFI();  
  //get temp data
  DHT dht(DHTPIN, DHT11,20);
  dht.begin();
  float h = dht.readHumidity();
  float t = dht.readTemperature(true);
  Serial.print(t);
  Serial.println( " temp from DHT11");
  if (isnan(h) || isnan(t)) 
  {
    Serial.println("Failed to read from DHT sensor!");
    ESP.deepSleep(3000e6);  //need to wire from D0 to RST ---- * 1000 since using microseconds
  }
  //get local weather data
  Serial.println("get internet temp");
  blinkLED(3);
  float viennaTemp = getInternetTemp();
  delay(1000);
  //write out the data
  Serial.println("writeThingSpeak");
  blinkLED(2);
  writeThingSpeak(t,h, viennaTemp);
  WiFi.disconnect();
  Serial.print("End of loop...sleeping (mins) ");
  //Serial.println(sleepPerLoop/60000);    
  ESP.deepSleep(3000e6);  //need to wire from D0 to RST ---- * 1000 since using microseconds
}

void setupWIFI()
{
  char* ssid = "";
  char* password = "";
  WiFi.mode(WIFI_STA);
  #ifdef WIFI1_S
    ssid = WIFI1_S;
    password = WIFI1_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
  #endif
  #ifdef WIFI2_S
    ssid = WIFI2_S;
    password = WIFI2_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
  #endif
  #ifdef WIFI3_S
    ssid = WIFI3_S;
    password = WIFI3_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
  #endif
  #ifdef WIFI4_S
    ssid = WIFI4_S;
    password = WIFI4_P;
    Serial.println(ssid);
    WiFiMulti.addAP(ssid, password);
  #endif
    #ifdef WIFI5_S
    ssid = WIFI5_S;
    password = WIFI5_P;
    Serial.println(ssid);
    WiFiMulti.addAP(ssid, password);
  #endif
}

void startWIFI()
{
  WiFi.mode(WIFI_STA);
  blinkLED(5);
  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      Serial.print(".");
      //delay(1000);
      blinkLED(3);
  }
  Serial.println("connected");
}

float getInternetTemp()
{  
  float out = -1;
  String willcloud = "willcloud.crabdance.com";
  //http://willcloud.crabdance.com/temp.php
  //https://www.theamplituhedron.com/articles/How-to-connect-to-an-SSL-protected-server-with-ESP8266(WiFiClient)/
  Serial.println("WiFiClientSecure");
  Serial.println("setFingerprint");
  String stream="";
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
      stream+=c;
    }
    Serial.print("finished reading: ");
    Serial.println(stream);
    sslClient.stop();
  }
   else
  {
    Serial.print("didnt connect to ");
    Serial.println(willcloud);
  }
  return stream.toFloat();
}


void writeThingSpeak(float temp, float humid, float vTemp )
{
  Serial.println("writeThingSpeak");
  ThingSpeak.begin(wifiClient);
  ThingSpeak.setField(1, temp);
  ThingSpeak.setField(2, humid);
  if(vTemp!=-1)
  {
    ThingSpeak.setField(3, vTemp);
  }
  int rc = ThingSpeak.writeFields(TP_CHANNEL,TP_APPLE);
  Serial.println( "TP return code: " +  String(rc));
  
  
  Serial.print("Temperature: ");
  Serial.println(temp);
  Serial.print(" degrees fahrenheit Humidity: "); 
  Serial.println(humid);
  Serial.print(" internet temp: "); 
  Serial.println(vTemp);
}

void blinkLED(int times)
{
  static int LEDON = 0;
  if(times >0)
  {
    for(int x=0; x < times; x++)
    {
      digitalWrite(LED_BUILTIN, LOW);   // turn the LED on 
      LEDON = 1;
      Serial.print(".");
      delay(222);
      digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on 
      LEDON = 0;
      delay(222);
    }
  }
  else  //-1 means to toggle
  {
    if(LEDON==1)
    {
      LEDON=0;
      digitalWrite(LED_BUILTIN, HIGH);
    }
    else
    {
       LEDON=1;
       digitalWrite(LED_BUILTIN, LOW);
    }
  }
}
