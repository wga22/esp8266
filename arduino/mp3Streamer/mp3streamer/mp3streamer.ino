/*
MP3 Iheart streamer
Special thanks:  https://github.com/schreibfaul1/ESP32-audioI2S
Intial: Summer 2020
Author: Will / wga22@yahoo.com

known issue: button sometimes takes multiple presses
*/

//possible configurations
// MakaPython_Audio - consider - https://www.makerfabs.com/wiki/index.php?title=MakaPython_Audio
//#define SSD1306
#define TTGO   //https://sites.google.com/site/jmaathuis/arduino/lilygo-ttgo-t-display-esp32
#include <wifi_credentials.h>
#include "Button2.h";   //TODO: why working with button2 1.3 and not 1.4?
#include "Arduino.h"
#include "Audio.h"
#include "SPIFFS.h"
#include <Adafruit_GFX.h>
#include <WiFiMulti.h>

#ifdef SSD1306
//SSD1306
  //Digital I/O used  //Makerfabs Audio V2.0
  #define I2S_LRC 0
  #define I2S_DOUT 15
  #define I2S_BCLK 2
  #define PIN_NEXT 35
  
  #define MAKEPYTHON_ESP32_SDA 21
  #define MAKEPYTHON_ESP32_SCL 19
  #define SCREEN_WIDTH 128 // OLED display width, in pixels
  #define SCREEN_HEIGHT 64 // OLED display height, in pixels
  #define OLED_RESET -1    // Reset pin # (or -1 if sharing Arduino reset pin)
//const int Pin_previous = 15;
  #include <Adafruit_SSD1306.h>
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
#endif


#ifdef TTGO
  #include <TFT_eSPI.h> // Graphics and font library for ST7735 driver chip
  #include <SPI.h>
  //Digital I/O used  //Makerfabs Audio V2.0
  #define I2S_LRC 27
  #define I2S_DOUT 26
  #define I2S_BCLK 25 
  #define PIN_PREVIOUS 35 
  #define PIN_NEXT 0

  TFT_eSPI tft = TFT_eSPI();  // Invoke library, pins defined in User_Setup.h
#endif

//const int Pin_vol_up = 39;
//const int Pin_vol_down = 36;
//const int Pin_mute = 35;

//const int Pin_pause = 33;
const String ihrls = "https://stream.revma.ihrhls.com/";
const String station_file = "/station.txt";

Audio audio;
WiFiMulti WiFiMulti;
Button2 nextButton = Button2(PIN_NEXT);
#ifdef PIN_PREVIOUS
  Button2 prevButton = Button2(PIN_PREVIOUS);
#endif

int volume = 21;
int mute_volume = 0;
uint run_time = 0;
uint button_time = 0;

String stations[][2] = {
  {"zc8143","The Breeze"},
  {"zc4439","Cool Oldies"},
  {"zc7078","Classic\nRock"},
  {"zc6878","Vinyl\nClassic\nRock"}, 
  {"zc3949","Pride\nRadio"},
  {"zc4409", "80's thru\nToday"},
  {"zc4422","Hits"},
  {"zc8478","2010's"},
  {"zc6850","2000's"},
  {"zc6834","90's"},
  {"zc5060","80's"},
  {"zc6788","Reggae"},
  {"zc6221","Beach&Pool"}, 
  {"zc4717","Real Oldies"}, 
  {"zc4719","R&B"}, 
  {"zc6437","90s Alt"},
  {"zc6148","Hawaii"}, 
  {"zc6137","Jazz"}, 
  {"zc6377","Classical"}, 
  {"zc6137","Christmas"}
};

int station_count = sizeof(stations) / sizeof(stations[0]);
int station_index = 0;
int saved_station_index = -1;
int loopCount = 0;


void setup()
{
  Serial.begin(19200);
  delay(2000);  //short pause for power stabilization
  //WIFI
  Serial.println("wifi setup");
  setupWIFI();
  connectWIFI();

  //IO setup
  //pinMode(Pin_vol_up, INPUT_PULLUP);
  //pinMode(Pin_vol_down, INPUT_PULLUP);
  //pinMode(Pin_mute, INPUT_PULLUP);
  //pinMode(Pin_previous, INPUT_PULLUP);
  //pinMode(Pin_pause, INPUT_PULLUP);
  //pinMode(PIN_NEXT, INPUT_PULLUP);
  nextButton.setClickHandler(nextSong);
  nextButton.setDebounceTime(5000);
  #ifdef PIN_PREVIOUS
    prevButton.setClickHandler(prevSong);
    prevButton.setDebounceTime(5000);
  #endif

  //display setup
  setupDisplay();
  logoshow();
  lcd_text("Wifi CONNECT");

  //audio setup
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(21); // 0...21
  
  //MP3 setup
  station_index = getFirstStation();
  open_new_radio(musicURL(stations[station_index][0]));
  lcd_text(stations[station_index][1]);
}


void loop()
{
    nextButton.loop();
    #ifdef PIN_PREVIOUS
      prevButton.loop();
    #endif
    audio.loop();
    if(loopCount++ > 1000)
    {
      connectWIFI();  //every so many cycles, verify wifi connection still alive, and reset if needed
      loopCount=0;
    }
}

void nextSong(Button2& btn)
{
  Serial.println("next clicked");
  connectWIFI();  //clicking button forces network reset
  station_index++;
  if(station_index >= station_count) //at the end
  {
    station_index = 0;
  }
  changeStation();
}

void prevSong(Button2& btn)
{
  Serial.println("prev clicked");
  connectWIFI();  //clicking button forces network reset
  station_index--;
  if (station_index < 0 )//circle back through beginning
  {
    station_index = station_count-1;
  }
  changeStation();
}

void changeStation()
{
  open_new_radio(musicURL(stations[station_index][0]));
  lcd_text(stations[station_index][1]);
  setStation(station_index);
}

String musicURL(String station_id)
{
  String url = ihrls + station_id;
  //Serial.println(url);
  return url;
}

int getFirstStation()
{
  //https://techtutorialsx.com/2018/08/05/esp32-arduino-spiffs-reading-a-file/
  //int station_index = 0;
  //int saved_station_index = -1;
  if(!SPIFFS.begin(true))
  {
        Serial.println("An Error has occurred while mounting SPIFFS");
        return 0;
  }
  if (SPIFFS.exists(station_file))
  {
      File f = SPIFFS.open(station_file, "r");
      if (f && f.size()) 
      {
          String fileData;
      
          while (f.available())
          {
            fileData += char(f.read());
          }
          f.close();
          int stat_num = fileData.toInt();
          Serial.println("reading station info to file: " + String(stat_num));
          if(stat_num > 0 && stat_num < station_count)
          {
            return stat_num;
          }
      }
  }
  return 0;
}

void setStation(int station_num)
{
  File file = SPIFFS.open(station_file, FILE_WRITE);
  if(file.print(station_num))
  {
    Serial.println("File was written");;
  }
  else 
  {
    Serial.println("File write failed");
  }
  file.close();
}

void setupWIFI()
{
  char* ssid = "";
  char* password = "";
  #ifdef WIFI1_S
    ssid = WIFI1_S;
    password = WIFI1_P;
    WiFiMulti.addAP(ssid, password);
    Serial.print(ssid);
    Serial.print(",");
  #endif
  #ifdef WIFI2_S
    ssid = WIFI2_S;
    password = WIFI2_P;
    WiFiMulti.addAP(ssid, password);
    Serial.print(ssid);
    Serial.print(",");
  #endif
  #ifdef WIFI3_S
    ssid = WIFI3_S;
    password = WIFI3_P;
    WiFiMulti.addAP(ssid, password);
    Serial.print(ssid);
    Serial.print(",");
  #endif
  #ifdef WIFI4_S
    ssid = WIFI4_S;
    password = WIFI4_P;
    Serial.print(ssid);
    Serial.print(",");
    WiFiMulti.addAP(ssid, password);
  #endif
    #ifdef WIFI5_S
    ssid = WIFI5_S;
    password = WIFI5_P;
    Serial.print(ssid);
    WiFiMulti.addAP(ssid, password);
  #endif
    Serial.println( " added");
}

void connectWIFI()
{
  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      Serial.print(".");
      delay(1000);  //long enough to test the connection
  }
  Serial.println("connected");  
}

void open_new_radio(String station)
{
    audio.connecttohost(station);
    Serial.println("**********start a new radio************");
}

void logoshow(void)
{
    lcd_text("Will Radio\nPress\nButton\nto go next");
    delay(100);
}

void lcd_text(String text)
{
#ifdef TTGO
  Serial.println("writing to screen");
  tft.setTextWrap(true);
  tft.fillScreen(TFT_BLACK);
  tft.setCursor(0, 30);
  tft.setTextColor(TFT_RED);
  tft.setRotation(1);
  tft.setTextSize(3);
  tft.println(text);
#endif

 #ifdef SSD1306
    display.clearDisplay();
    display.setTextSize(2);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text
    display.setCursor(0, 0);             // Start at top-left corner
    display.println(text);
    display.display();
    //delay(10);
#endif

}

void setupDisplay()
{
    #ifdef SSD1306
    //LCD
    Wire.begin(MAKEPYTHON_ESP32_SDA, MAKEPYTHON_ESP32_SCL);
    // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
    { // Address 0x3C for 128x32
        Serial.println(F("SSD1306 allocation failed"));
        for (;;)
            ; // Don't proceed, loop forever
    }
    display.clearDisplay();
  #endif

  #ifdef TTGO
    tft.init();   // initialize a ST7735S chip
  #endif
}
