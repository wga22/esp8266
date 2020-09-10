/*
https://coronavirus-tracker-api.herokuapp.com/all

https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-14-2020.csv
http://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-14-2020.csv


//#include "esp_wpa2.h"
//#include <Wire.h>
//#include "esp_wpa2.h"
//#include <WiFi.h>
//#include "WiFiEsp.h"

const String COVID_CONFIRMED = "raw.githubusercontent.com";

//WiFiClient wifi;
//HttpClient client = HttpClient(wifi, COVID_CONFIRMED, 443);


String getCovidURL()
{
    //compile URL
  String sDate ="03-14-2020";
  //String compiledURL = COVID_CONFIRMED + sDate + ".csv";
  return compiledURL;
}

 
 */
#include <WiFiClientSecure.h>
#include <WiFiMulti.h>
#include <ArduinoHttpClient.h>
#include <M5StickC.h>
// need for date? #include <WiFi.h>
#include "ESPDateTime.h"
#include <wifi_credentials.h>

#define TFT_GREY 0x5AEB

WiFiMulti WiFiMulti;

const char* host = "raw.githubusercontent.com"; //external server domain for HTTP connection after authentification
int counter = 0;
int loadTries = 0;
const int SECOND = 1000;
const int HOUR = 3600 * SECOND;
const int LITTLEDAY = HOUR * 24 / 1000;

WiFiClientSecure client;


void setup()
{
  Serial.begin(115200);
  delay(SECOND);
  //setup M5
  Serial.println("Doing M5 setup");
  M5.begin();
  M5.Lcd.setTextColor(TFT_WHITE, TFT_BLACK);  // Adding a background colour erases previous text automatically
  M5.Lcd.setTextSize(2);
  M5.Lcd.setRotation(3);
  M5.Lcd.fillScreen(TFT_BLACK);

  Serial.println("WIFI setup");
  setupWIFI();

  Serial.println();
  Serial.print("Waiting for WiFi... ");

  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      Serial.print(".");
      delay(SECOND);
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  M5.Lcd.drawRightString(IpAddress2String(WiFi.localIP()), 1, rowY(2), 1);
  delay(SECOND);

  //setup date
  setupDateTime();
}

void loop() 
{
  //M5.Lcd.println("Will");
  //M5.Lcd.drawRightString(const char *string, int dX, int poY, int font);
  loadTries = 0;

  verifyWifi();
  
  int nNow = DateTime.now();
  int nYesterday = nNow - LITTLEDAY;
  int twoBack = nYesterday - LITTLEDAY;
  int nTodayCount = getData4("51059", "Fairfax", nNow);
  int nYesterdayCount = getData4("51059", "Fairfax", nYesterday);
  int nTwoBackCount = getData4("51059", "Fairfax", twoBack);

  M5.Lcd.fillScreen(TFT_BLACK);
  if(nTodayCount == -1) //todays count not ready yet
  {
    Serial.println("no value today, using yesterday - " + String(nYesterdayCount));
    nNow = nYesterday;  //for the date display
    nTodayCount = nYesterdayCount;  //shift back the values
    nYesterdayCount = nTwoBackCount; //shift back the values
    nTwoBackCount = getData4("51059", "Fairfax", (twoBack-LITTLEDAY));  //load 3rd day, from 4 days ago
  }
  else
  {
    //nothing to do, just debug
    Serial.println("today's value: " + nTodayCount);
  }
  int nDailyGrowth = nTodayCount - nYesterdayCount;
  Serial.println("daily growth:" + String(nDailyGrowth));
  Serial.println("t:" + String(nTodayCount) + "y:" + String(nYesterdayCount) + "YY:" + String(nTwoBackCount));

  M5.Lcd.drawRightString((DateFormatter::format("%m-%d-%Y", nNow)), 1, rowY(0), 1);
  M5.Lcd.drawRightString(String(nTodayCount), 1, rowY(1), 1);
  String sThirdRow = (String(nDailyGrowth) + " " + String(percChange(nTodayCount,nYesterdayCount,nTwoBackCount ) ) + "%");
  Serial.println(sThirdRow);
  M5.Lcd.drawRightString(sThirdRow, 1, rowY(2), 1);

  
  delay(HOUR * 2);//2hrs - - success, so wait a while for new day
 // M5.Lcd.drawRightString(fileDate, 1, rowY(0), 2);
 // M5.Lcd.drawRightString(output, 1, rowY(1), 2);
  
}

void setupWIFI()
{
  char* ssid = "";
  char* password = "";
  #ifdef WIFI1_S
    ssid = WIFI1_S;
    password = WIFI1_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
    M5.Lcd.drawRightString(ssid, 1, rowY(1), 1);
    delay(SECOND*2);
  #endif
  #ifdef WIFI2_S
    ssid = WIFI2_S;
    password = WIFI2_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
    M5.Lcd.drawRightString(ssid, 1, rowY(1), 1);
    delay(SECOND*2);
  #endif
  #ifdef WIFI3_S
    ssid = WIFI3_S;
    password = WIFI3_P;
    WiFiMulti.addAP(ssid, password);
    Serial.println(ssid);
    M5.Lcd.drawRightString(ssid, 1, rowY(1), 1);
    delay(SECOND*2);
  #endif
  #ifdef WIFI4_S
    ssid = WIFI4_S;
    password = WIFI4_P;
    Serial.println(ssid);
    WiFiMulti.addAP(ssid, password);
    M5.Lcd.drawRightString(ssid, 1, rowY(1), 1);
    delay(SECOND*2);
  #endif
    #ifdef WIFI5_S
    ssid = WIFI5_S;
    password = WIFI5_P;
    Serial.println(ssid);
    WiFiMulti.addAP(ssid, password);
    M5.Lcd.drawRightString(ssid, 1, rowY(1), 1);
    delay(SECOND*2);
  #endif
}

float percChange(int A, int B, int C)
{
  //compare diff of A-B to diff of B-C
  int todayGrowth = A-B;
  int yesterdayGrowth= B-C;
  Serial.println("percchange: " + String(todayGrowth) + "  / " + String(yesterdayGrowth));
  float retVal =(float(todayGrowth-yesterdayGrowth) / yesterdayGrowth)*100;
  Serial.println("ret perc:" +String(retVal));
  return retVal;
}
int getData4(String searchCode, String searchValue, time_t searchDate)
{
  //local scope
  bool dateFound = false;
  int retVal = -1;
  Serial.print("Connecting to website: ");
  Serial.println(host);
  if (client.connect(host, 443)) 
  {
    //date work
    String fileDate = DateFormatter::format("%m-%d-%Y", searchDate);
    Serial.println(fileDate);
    //String url = "/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-14-2020.csv";
    String url = "/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/" + fileDate + ".csv";
    client.print(String("GET ") + url + " HTTP/1.1\r\n" + "Host: " + host + "\r\n" + "User-Agent: IE\r\n" + "Connection: close\r\n\r\n");
    Serial.println("working to connect " + url);
    String line;
    while (client.connected()) 
    {
      String line = client.readStringUntil('\n');
      //Serial.print(line);
      int loc = line.indexOf(searchCode);
      //Serial.println(" ----loc: " + String(loc));
      if (loc >= 0)
      {
        dateFound = true;
        Serial.println("found " + searchCode);
        Serial.println(line);
        String chunk = line.substring(loc + searchValue.length());  //virginia
        //world's worst CSV parser...
        int SICKCOLUMN = 6;
        for(int x=0; x < SICKCOLUMN; x++)
        {
          Serial.println(chunk + " ");
          chunk = chunk.substring(chunk.indexOf(",")+1);
        }
        String theCount = chunk.substring(0,chunk.indexOf(","));
        retVal = theCount.toInt();
        Serial.println(theCount);
        break;
      }
    }
  }
  Serial.println("getdata: " + String(retVal));
  client.stop();
  return retVal; 
}

int rowY(int position)
{
  //each row is 20 pixels high
  return 2 + position * 20;
}

String IpAddress2String(const IPAddress& ipAddress)
{
  return String(ipAddress[0]) + String(".") +\
  String(ipAddress[1]) + String(".") +\
  String(ipAddress[2]) + String(".") +\
  String(ipAddress[3])  ;
}


void verifyWifi()
{
  //wifi
  if (WiFi.status() == WL_CONNECTED) 
  { //if we are connected to Eduroam network
    counter = 0; //reset counter
    Serial.println("Wifi is still connected with IP: "); 
    Serial.println(WiFi.localIP());   //inform user about his IP address
  }
  else if (WiFi.status() != WL_CONNECTED) 
  { //if we lost connection, retry
    setupWIFI();     
  }
  while (WiFi.status() != WL_CONNECTED) 
  { //during lost connection, print dots
    delay(SECOND);
    Serial.print(".");
    counter++;
    if(counter>=60)
    { //30 seconds timeout - reset board
      ESP.restart();
    }
  }
}

void setupDateTime() 
{
  // setup this after wifi connected
  // you can use custom timeZone,server and timeout
  // DateTime.setTimeZone(-4);
  //   DateTime.setServer("asia.pool.ntp.org");
  //   DateTime.begin(15 * 1000);
  DateTime.setTimeZone(-8);
  DateTime.begin();
  if (!DateTime.isTimeValid()) {
    Serial.println("Failed to get time from server.");
  }
}
