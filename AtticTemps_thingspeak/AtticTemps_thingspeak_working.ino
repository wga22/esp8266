// www.arduinesp.com 
//
// Plot DTH11 data on thingspeak.com using an ESP8266 
// April 11 2015
// Author: Jeroen Beemster
// Website: www.arduinesp.com
//WORKING
 
#include <DHT.h>
#include <ESP8266WiFi.h>
 
// replace with your channel's thingspeak API key, 
String apiKey = "NK6HEWTA7BC9ANLD";
const char* ssid = "mcdonalds";
const char* password = "9085612944danica";
bool resetWifiEachTime = true;
const char* server = "api.thingspeak.com";
#define DHTPIN 2 // what pin we're connected to
 
DHT dht(DHTPIN, DHT11,20);
WiFiClient client;
int sleepPerLoop = 60*1000*60;  //1 hr   
 
void setup() {                
  delay(5*1000*60);  //5 mins
  dht.begin();
  if (!resetWifiEachTime) {
    startWifi();
  }
}

void startWifi()
{
  Serial.begin(115200);
  delay(100);
  
  WiFi.begin(ssid, password);
 
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
      
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
}

void loop() {
  if(resetWifiEachTime){
    startWifi();   
  }
  float h = dht.readHumidity();
  float t = dht.readTemperature(true);
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
 
  if (client.connect(server,80)) {  //   "184.106.153.149" or api.thingspeak.com
    String postStr = apiKey;
           postStr +="&field1=";
           postStr += String(t);
           postStr +="&field2=";
           postStr += String(h);
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
