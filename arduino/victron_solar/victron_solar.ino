// record data from Victron Solar Controller
// Sept 26 2020
// Author: Will Allen
#include <ESP8266WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <wifi_credentials.h>
#define RXPIN 2 // what pin we're connected to
#define TXPIN 3 // what pin we're connected to

/*
 * thingspeak: https://thingspeak.com/channels/140150
 *docs: https://beta.ivc.no/wiki/index.php/Victron_VE_Direct_DIY_Cable
PID 0xA043      -- Product ID for BlueSolar MPPT 100/15
FW  119     -- Firmware version of controller, v1.19
SER#  HQXXXXXXXXX   -- Serial number
V 13790     -- Battery voltage, mV
I -10     -- Battery current, mA
VPV 15950     -- Panel voltage, mV
PPV 0     -- Panel power, W
CS  5     -- Charge state, 0 to 9
ERR 0     -- Error code, 0 to 119
LOAD  ON      -- Load output state, ON/OFF
IL  0     -- Load current, mA
H19 0       -- Yield total, kWh
H20 0     -- Yield today, kWh
H21 397     -- Maximum power today, W
H22 0       -- Yield yesterday, kWh
H23 0     -- Maximum power yesterday, W
HSDS  0     -- Day sequence number, 0 to 365
Checksum  l:A0002000148   -- Message checksum

actual:
PID  0xA04C
FW  150
SER#  HQ19379192M
V 14140
I 1340
VPV 15450
PPV 31
CS  3
MPPT  2
ERR 0
LOAD  ON
IL  800
H19 20
H20 11
H21 91
H22 2
H23 12
HSDS  2
Checksum  µ:AD7ED00160071
:AD5ED008605FE
:ABCED00720C000024
:ABBED000E068F
:AADED000800A9

recording:
V 13790     -- Battery voltage, mV
I -10     -- Battery current, mA
VPV 15950     -- Panel voltage, mV
PPV 0     -- Panel power, W
CS  5     -- Charge state, 0 to 9
IL  0     -- Load current, mA
H22 0       -- Yield yesterday, kWh
H23 0     -- Maximum power yesterday, W

--FUTURE:
ERR 0     -- Error code, 0 to 119
HSDS  0     -- Day sequence number, 0 to 365
H19 0       -- Yield total, kWh
H20 0     -- Yield today, kWh
H21 397     -- Maximum power today, W


*/ 
String apiKey = "0NRCT2ZN3PNTMHUG";
const int httpsPort = 443;
const int SERIALRATE = 19200;
//make sure you at least have a WIFI1 in your credentials file

const unsigned int MAX_INPUT = 50;
const char* server = "api.thingspeak.com";
ESP8266WiFiMulti WiFiMulti;
WiFiClientSecure sslClient;

bool resetWifiEachTime = true;
int sleepPerLoop = 60*1000*60;  //1 hr   

void setup() 
{ 
	Serial.begin(SERIALRATE);
	consoleWrite("waiting for power to stabilize");
	delay(1000*10);  //10 secs
  sslClient.setInsecure();
  //sslClient.setFingerprint(fingerprint);
  setupWIFI();
}

void consoleWrite(String out)
{
  //do nothing for now, serial in use for reading!
  Serial.println(out);
}

void loop() 
{
  startWIFI();

  //write out the data
  consoleWrite("writeThingSpeak");
  writeThingSpeak();
  WiFi.disconnect();
  consoleWrite("End of loop...sleeping (mins) ");
  consoleWrite(String(sleepPerLoop/60000));    
  delay(sleepPerLoop);
  //TODO: deepsleep
  // thingspeak needs minimum 15 sec delay between updates  
}


int process_data(String searchString, String rowFromPanel)
{
  int res = -1;
  int posOfVar = rowFromPanel.indexOf(searchString);
  if(posOfVar > -1)
  {
    String valueDetail = rowFromPanel.substring(1+searchString.length());
    valueDetail.trim();
    res = valueDetail.toInt();
    consoleWrite("found line and match:" + searchString + " == " + rowFromPanel + " -> " + valueDetail + " ->" + res);
  }
  else
  {
    consoleWrite("found line, but no match:" + searchString + " <> " + rowFromPanel);
  }
  return res;
}

int getBoxOfSerial(String searchString)
{
  int returnValue = -1;
  //pull no more than 100 lines looking for this value
  
  for(int nLine = 0; nLine < 100 && returnValue==-1; nLine++)
  {
    static char input_line[MAX_INPUT];
    static unsigned int input_pos = 0;
    delay(100);
    //consoleWrite(".");
  
    if (Serial.available() > 0)
    {
      char inByte = Serial.read();
 
      switch (inByte)
      {
        case '\n':   // end of text
        {
          input_line [input_pos] = 0;  // terminating null byte
         
          // terminator reached! process input_line here ...
          String row = input_line;
          returnValue = process_data(searchString, row);
         
          // reset buffer for next time
          input_pos = 0; 
          break;
        }
        case '\r':   // discard carriage return
          //consoleWrite("nothing");
          break;
   
        default:
          // keep adding if not full ... allow for terminating null byte
          if (input_pos < (MAX_INPUT - 1))
          {
            input_line[input_pos++] = inByte;
            //Serial.print(inByte);
          }
          break;
  
        }  // end of switch
    }  // end of incoming data    
  }//for maxtries
  return returnValue;
}


void writeThingSpeak()
{
  int solarValues[8];
  /*
  recording:
  V 13790     -- Battery voltage, mV
  I -10     -- Battery current, mA
  VPV 15950     -- Panel voltage, mV
  PPV 0     -- Panel power, W
  CS  5     -- Charge state, 0 to 9
  IL  0     -- Load current, mA
  H22 0       -- Yield yesterday, kWh
  H23 0     -- Maximum power yesterday, W
  */
  solarValues[0] = getBoxOfSerial("V");
  solarValues[1] = getBoxOfSerial("I");
  solarValues[2] = getBoxOfSerial("VPV");
  solarValues[3] = getBoxOfSerial("PPV");
  solarValues[4] = getBoxOfSerial("CS");
  solarValues[5] = getBoxOfSerial("IL");
  solarValues[6] = getBoxOfSerial("H22");
  solarValues[7] = getBoxOfSerial("H23");


  
  consoleWrite(String(solarValues[0]) + ", " +String(solarValues[1]) + ", " +String(solarValues[2]) + ", " +String(solarValues[3]) + ", " +String(solarValues[4]) + ", " +String(solarValues[5]));
  if (sslClient.connect(server,httpsPort)) 
  {  //   "184.106.153.149" or api.thingspeak.com
    String postStr = apiKey;
    for(int x=0; x < 8; x++)  //8 fields
    {
      postStr +="&field"+String(x+1)+"=";
      postStr += String(solarValues[x]);
      consoleWrite("field"+String(x+1)+": " + String(solarValues[x]));
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

     consoleWrite(postStr);
  }
  else
  {
    consoleWrite("didnt connect to " + String(server));
    //consoleWrite(server);
  }
  sslClient.stop();
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
  #endif
  #ifdef WIFI2_S
    ssid = WIFI2_S;
    password = WIFI2_P;
    WiFiMulti.addAP(ssid, password);
  #endif
  #ifdef WIFI3_S
    ssid = WIFI3_S;
    password = WIFI3_P;
    WiFiMulti.addAP(ssid, password);
  #endif
  #ifdef WIFI4_S
    ssid = WIFI4_S;
    password = WIFI4_P;
    WiFiMulti.addAP(ssid, password);
  #endif
    #ifdef WIFI5_S
    ssid = WIFI5_S;
    password = WIFI5_P;
    WiFiMulti.addAP(ssid, password);
  #endif
}

void startWIFI()
{
  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      delay(1000);
  }
  consoleWrite("connected");
}
