<<<<<<< HEAD
#include <wifi_credentials.h>

#include "Arduino.h"
#include "Audio.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
//#include "wificredentials.h"
#include <WiFiMulti.h>

/*
//Digital I/O used  //Makerfabs Audio V2.0
#define I2S_DOUT 22
#define I2S_BCLK 23
#define I2S_LRC 21

//SSD1306
#define MAKEPYTHON_ESP32_SDA 0
#define MAKEPYTHON_ESP32_SCL 4
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define OLED_RESET -1    // Reset pin # (or -1 if sharing Arduino reset pin)
*/
//Digital I/O used  //Makerfabs Audio V2.0
#define I2S_LRC 0
#define I2S_DOUT 15
#define I2S_BCLK 2

//SSD1306
#define MAKEPYTHON_ESP32_SDA 21
#define MAKEPYTHON_ESP32_SCL 19
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define OLED_RESET -1    // Reset pin # (or -1 if sharing Arduino reset pin)



Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

//Button
=======
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


#include "Button2.h";
#include "Arduino.h"
#include "Audio.h"
#include "SPIFFS.h"
#include <Adafruit_GFX.h>
#include <WiFi.h>
#include <WebServer.h>
#include <AutoConnect.h>


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
>>>>>>> 73c1f55ccfb5194246e0168b978c6831d9f8d8b7

//const int Pin_vol_up = 39;
//const int Pin_vol_down = 36;
//const int Pin_mute = 35;

<<<<<<< HEAD
//const int Pin_previous = 15;
//const int Pin_pause = 33;
//ALLEN const int Pin_next = 2;
const String ihrls = "https://stream.revma.ihrhls.com/";
const int Pin_next = 23;

Audio audio;
WiFiMulti WiFiMulti;

struct Music_info
{
    String name;
    int length;
    int runtime;
    int volume;
    int status;
    int mute_volume;
} music_info = {"", 0, 0, 0, 0, 0};

int volume = 21;
int mute_volume = 0;

int runtime = 0;
int length = 0;

String stations[][2] = {
    {"zc8143","The Breeze"},  //breeze
    {"zc3949","Pride\nRadio"}, //pride 
    {"zc4422","Hits"},  //hits
    {"zc4409", "80's thru\nToday"},  //80s to today
    {"zc8478","2010's"},  //2010
    {"zc6850","2000's"},  //2000s
    {"zc6834","90's"},  //90s
    {"zc5060","80's"},  //80s
    {"zc7078","Classic\nRock"},  //classic rock
    {"zc6788","Reggae"}, //Reggae
    {"zc6137","Christmas"} //Christmas
};

int station_index = 0;
int station_count = sizeof(stations) / sizeof(stations[0]);

void setup()
{
    //IO mode init
    //pinMode(Pin_vol_up, INPUT_PULLUP);
    //pinMode(Pin_vol_down, INPUT_PULLUP);
    //pinMode(Pin_mute, INPUT_PULLUP);
    //pinMode(Pin_previous, INPUT_PULLUP);
    //pinMode(Pin_pause, INPUT_PULLUP);
    pinMode(Pin_next, INPUT_PULLUP);

    //Serial
    Serial.begin(115200);

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
    logoshow();

    //connect to WiFi
    setupWIFI();
    /*
   can remove once multiwifi tested
    Serial.printf("Connecting to %s ", ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" CONNECTED");
    lcd_text("Wifi CONNECT");
     */

    //Audio(I2S)
    audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
    audio.setVolume(21); // 0...21

    //first station
    open_new_radio(musicURL(stations[station_index][0]));
    lcd_text(stations[station_index][1]);
}

uint run_time = 0;
uint button_time = 0;

void loop()
{
    audio.loop();
    //print_song_time();
    if (digitalRead(Pin_next) == 0 && millis() - button_time > 300)
    {
      //button_time = millis();
      Serial.print("PRESSED: " );
      Serial.println(button_time);
      Serial.println("Pin_next");
      if (station_index < station_count - 1)
      {
          station_index++;
      }
      else
      {
          station_index = 0;
      }
      button_time = millis();

      open_new_radio(musicURL(stations[station_index][0]));
      lcd_text(stations[station_index][1]);
     }
=======
//const int Pin_pause = 33;
const String ihrls = "https://stream.revma.ihrhls.com/";
const String station_file = "/station.txt";

WebServer Server;
AutoConnect Portal(Server);
Audio audio;


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
  Server.on("/", rootPage);

  //https://hieromon.github.io/AutoConnect/advancedusage.html
  //AutoConnectConfig  Config;
  //TODO - make it smart, only set this once
  //String id = "iheartradio" + String(random(10,99));
  //Config.hostName = id;
  Portal.config(Config);
  Portal.begin();

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
    Portal.handleClient();
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

void rootPage()
{
  //https://hieromon.github.io/AutoConnect/basicusage.html
  char content[] = "TODO: station selection, add stations";
  Server.send(200, "text/plain", content);
}


void nextSong(Button2& btn)
{
  Serial.println("next");
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
>>>>>>> 73c1f55ccfb5194246e0168b978c6831d9f8d8b7
}

String musicURL(String station_id)
{
  String url = ihrls + station_id;
  //Serial.println(url);
  return url;
}

<<<<<<< HEAD

void setupWIFI()
{
  char* ssid = "";
  char* password = "";
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
  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      Serial.print(".");
      delay(1000);
  }
  Serial.println("connected");
}

void print_song_time()
{
    runtime = audio.getAudioCurrentTime();
    length = audio.getAudioFileDuration();
}

void open_new_radio(String station)
{
    audio.connecttohost(station);
    runtime = audio.getAudioCurrentTime();
    length = audio.getAudioFileDuration();
=======
void connectWIFI()
{
  //TODO
  Serial.println("FIX connectWIFI");  
  /*
  while(WiFiMulti.run() != WL_CONNECTED) 
  {
      Serial.print(".");
      delay(1000);  //long enough to test the connection
  }
  Serial.println("connected");  
  */
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


void open_new_radio(String station)
{
    audio.connecttohost(station);
>>>>>>> 73c1f55ccfb5194246e0168b978c6831d9f8d8b7
    Serial.println("**********start a new radio************");
}

void logoshow(void)
{
    lcd_text("Will Radio\nPress\nButton\nto go next");
    delay(100);
}

void lcd_text(String text)
{
<<<<<<< HEAD
=======
   //text.replace("-", "\n");
   //text.replace("/", "\n");
   text.replace("\"", "");
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
>>>>>>> 73c1f55ccfb5194246e0168b978c6831d9f8d8b7
    display.clearDisplay();
    display.setTextSize(2);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text
    display.setCursor(0, 0);             // Start at top-left corner
    display.println(text);
    display.display();
<<<<<<< HEAD
    delay(100);
}

//**********************************************
// optional
void xx_audio_info(const char *info)//removing, since causes blip
{
    Serial.print("info        ");
    Serial.println(info);
}
void xx_audio_id3data(const char *info)
{ //id3 metadata
    Serial.print("id3data     ");
    Serial.println(info);
}

void xx_audio_eof_mp3(const char *info)
{ //end of file
    Serial.print("eof_mp3     ");
    Serial.println(info);
}
void xx_audio_showstation(const char *info)
{
    Serial.print("station     ");
    Serial.println(info);
}
void xx_audio_showstreaminfo(const char *info)
{
    Serial.print("streaminfo  ");
    Serial.println(info);
}
void xx_audio_showstreamtitle(const char *info)
{
    Serial.print("streamtitle ");
    Serial.println(info);
}
void xx_audio_bitrate(const char *info)
{
    Serial.print("bitrate     ");
    Serial.println(info);
}
void xx_audio_commercial(const char *info)
{ //duration in sec
    Serial.print("commercial  ");
    Serial.println(info);
}
void xx_audio_icyurl(const char *info)
{ //homepage
    Serial.print("icyurl      ");
    Serial.println(info);
}
void xx_audio_lasthost(const char *info)
{ //stream URL played
    Serial.print("lasthost    ");
    Serial.println(info);
}
void xx_audio_eof_speech(const char *info)
{
    Serial.print("eof_speech  ");
    Serial.println(info);
=======
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

void audio_showstreamtitle(const char *info)
{
    Serial.print("streamtitle ");
    Serial.println(info);
    //lcd_text(stations[station_index][1] +"\n" + info);
    lcd_text(info);
>>>>>>> 73c1f55ccfb5194246e0168b978c6831d9f8d8b7
}
