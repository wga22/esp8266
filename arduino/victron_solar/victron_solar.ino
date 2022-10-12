// record data from Victron Solar Controller
// Sept 26 2020
// Author: Will Allen
//BOARD in use: NODEMCU V09 ESP-12 module
//TODO #include <ESP8266WiFiMulti.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include "ThingSpeak.h"
#include <SoftwareSerial.h>
#include <wifi_credentials.h>
//TODO: put thingspeak creds here.
#define RXPIN D1 // receive -for esp8266 there are many pins that cannot be used.
#define TXPIN D2 //trans

/*
 * thingspeak: https://thingspeak.com/channels/140150
 *docs: https://beta.ivc.no/wiki/index.php/Victron_VE_Direct_DIY_Cable
 *  BOARD: ESP8266 NODEMCU
 * changes:
 * -Feb 2022 - updated to support max values, and set sleep to 30 mins (1800 secs) from 3000 secs
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
const char * TP_APPLE = "0NRCT2ZN3PNTMHUG";
const unsigned long TP_CHANNEL = 140150;
const int SERIALRATE = 19200;
//make sure you at least have a WIFI1 in your credentials file

WiFiClient wifiClient;
WiFiClientSecure sslClient;
SoftwareSerial mySerial(RXPIN, TXPIN); // RX, TX

const int sleepMicrosPerLoop = 1800e6;  //30 mins  
// UNTESTED const unsigned int microSecHour = 2.77778e-10; 

void setup() 
{ 
  consoleWrite("waiting for power to stabilize");
  delay(1000*10);  //10 secs
	WiFi.mode(WIFI_STA);
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(RXPIN, INPUT);
  pinMode(TXPIN, OUTPUT);
  Serial.begin(SERIALRATE);        
  String setupMessage = "connected to second serial: " + String(RXPIN) + ", " + String(TXPIN);
  mySerial.println(setupMessage);
  consoleWrite(setupMessage);
}

void loop() 
{
  //setup
  startWIFI();
  mySerial.begin(SERIALRATE);
  consoleWrite("Loop");
  //write out the data
  writeThingSpeak();

  //closeout
  WiFi.disconnect();
  mySerial.end();
  consoleWrite("CLOSEOUT: End of loop...sleeping ("+String(sleepMicrosPerLoop/60e6)+"mins) ");
  ESP.deepSleep(3000e6);  //need to wire from D0 to RST ---- * 1000 since using microseconds - might require resistor?!
  //TODO: UNTESTED ESP.deepSleep(2777e8);  //need to wire from D0 to RST ---- * 1000 since using microseconds  2.77778e-10
  
  //deepsleep - https://randomnerdtutorials.com/esp8266-deep-sleep-with-arduino-ide/
  // thingspeak needs minimum 15 sec delay between updates  
}

void consoleWrite(String out)
{
  Serial.println(out);
  //mySerial.println(out);
}

//TODO: reread the data when something out of range comes back
int process_data(String searchString, String rowFromPanel)
{
  int res = -1;
  int posOfVar = rowFromPanel.indexOf(searchString);
  if(posOfVar > -1)
  {
    //TODO: how to handle when PPV returns 21 instead of 21000 as expected?
    String valueDetail = rowFromPanel.substring(searchString.length());//make sure space is in the searchstring
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

int getBoxOfSerial(String searchString, int maxSerialVal)
{
  int returnValue = -1;
  blinkLED(-1); //turn LED on while processing off
  //take best record from 100 lines
  for(int nLine = 0; nLine < 100; nLine++)  //give 1 min to find the data
  {
    if(mySerial.available()>0)
    {
      //mySerial.readStringUntil('\n'); //flush the first imperfect buffer line
      String inputLine = mySerial.readStringUntil('\n');
      int possibleValue = process_data(searchString, inputLine);
      if(possibleValue!=-1)
      {
        //increment nLine since a match was found
        nLine += 10;
        returnValue = max(possibleValue, returnValue);
      }
    }
    //if value out of range, try again by resetting returnvalue=-1
    if(maxSerialVal != -1 && returnValue > maxSerialVal)
    {
      returnValue = -1;
    }
    delay(60);
  }//for maxtries
  blinkLED(-1);   //turn LED back off
  return returnValue;
}

void writeThingSpeak()
{
  /*
  recording:
  V 13790     -- Battery voltage, mV  -field1[0] validMAX: <40000
  I -10     -- Battery current, mA    -field2[1] validMAX: <40000
  VPV 15950     -- Panel voltage, mV  -field3[2] validMAX: <60000
  H19 0       -- Yield total, kWh     -field4[3] validMAX: no max
  CS  5     -- Charge state, 0 to 9   -field5[4] validMAX: <10
  IL  0     -- Load current, mA       -field6[5] validMAX: <60000
  H20 0     -- Yield today, kWh       -field7[6] validMAX: <2000?
  H21 397   -- Max power today (W)    -field8[7] validMAX: <10000?

  TESTING
  PPV 0     -- Panel power, W         -field0 validMAX:   -always 0?  
  H22 0       -- Yield yesterday, kWh -field0 validMAX:
  H23 0     -- Maximum power yesterday, W  -field0 validMAX:
  
  */
  consoleWrite("writeThingSpeak start");
  ThingSpeak.begin(wifiClient);
  String fields[8] = {"V\t", "I\t", "VPV\t", "H19\t", "CS\t", "IL\t", "H20\t", "H21\t"}; // tab is field separator
  int maxVals[8] = {60000, 60000, 60000, -1, 11, 60000,10000,10000};
  for(int x = 0; x< 8; x++)
  {
    consoleWrite("field:" +fields[x] );
    int fieldVal = getBoxOfSerial(fields[x], maxVals[x]);
    if(fieldVal!=-1)
    {
      ThingSpeak.setField((x+1), fieldVal);
    }
    consoleWrite("field:" +fields[x] + " value " +  fieldVal);
    blinkLED(x+1);
  }
  int rc = ThingSpeak.writeFields(TP_CHANNEL,TP_APPLE);
  consoleWrite( "TP return code: " +  String(rc));
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

void startWIFI()
{
  if(WiFi.status() != WL_CONNECTED)
  {
    Serial.print("Attempting to connect to SSID: ");
    Serial.println(WIFI1_S);
    int x =22;
    while(WiFi.status() != WL_CONNECTED && x-- >0)
    {
      WiFi.begin(WIFI1_S, WIFI1_P);
      blinkLED(10);
    } 
    if(x<1)
    {
      //something wrong
      //ESP.restart();
      //sleep instead of restarting
      //ESP.deepSleep(3000e6);  //need to wire from D0 to RST ---- * 1000 since using microseconds
      ESP.deepSleep(sleepMicrosPerLoop);  //need to wire from D0 to RST ---- * 1000 since using microseconds
    }
    Serial.println("\nConnected.");
  }
}
