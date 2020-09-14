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

//const int Pin_vol_up = 39;
//const int Pin_vol_down = 36;
//const int Pin_mute = 35;

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
  {"zc8143","The Breeze"},
  {"zc3949","Pride\nRadio"},
  {"zc4422","Hits"},
  {"zc4409", "80's thru\nToday"},
  {"zc8478","2010's"},
  {"zc6850","2000's"},
  {"zc6834","90's"},
  {"zc5060","80's"},
  {"zc7078","Classic\nRock"},
  {"zc6788","Reggae"},
  {"zc6137","Christmas"},
  {"zc6221","Beach"}, 
  {"zc6878","Vinyl\nClassic\nRock"}, 
  {"zc4717","Real Oldies"}, 
  {"zc4439","Cool Oldies"},
  {"zc6377","Classical"}, 
  {"zc6137","Jazz"}, 
  {"zc4719","R&B"}, 
  {"zc6148","Hawaii"}, 
  {"zc6437","90s Alt"}
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
}

String musicURL(String station_id)
{
  String url = ihrls + station_id;
  //Serial.println(url);
  return url;
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
    Serial.println("**********start a new radio************");
}

void logoshow(void)
{
    lcd_text("Will Radio\nPress\nButton\nto go next");
    delay(100);
}

void lcd_text(String text)
{
    display.clearDisplay();
    display.setTextSize(2);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text
    display.setCursor(0, 0);             // Start at top-left corner
    display.println(text);
    display.display();
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
}
