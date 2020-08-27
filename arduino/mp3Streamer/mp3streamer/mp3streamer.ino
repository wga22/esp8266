#include "Arduino.h"
#include "Audio.h"
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <wificredentials.h>
#include <WiFiMulti.h>

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

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

//Button
const int Pin_vol_up = 39;
const int Pin_vol_down = 36;
const int Pin_mute = 35;

const int Pin_previous = 15;
const int Pin_pause = 33;
const int Pin_next = 2;

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

String stations[] = {
    "https://n0ba-e2.revma.ihrhls.com/zc8143",  //breeze
    "https://n0ba-e2.revma.ihrhls.com/zc3949", //pride 
    "https://n1da-e2.revma.ihrhls.com/zc4422",  //hits
    "https://n0ba-e2.revma.ihrhls.com/zc4409",  //80s to today
    "https://n0ba-e2.revma.ihrhls.com/zc8478",  //2010
    "https://n0ba-e2.revma.ihrhls.com/zc6850",  //2000s
    "https://n0ba-e2.revma.ihrhls.com/zc6834",  //90s
    "https://n0ba-e2.revma.ihrhls.com/zc5060",  //80s
    "https://n0ba-e2.revma.ihrhls.com/zc7078",  //classic rock
    "https://n32a-e2.revma.ihrhls.com/zc6788" //Reggae
};
String station_names[] = {
    "The Breeze",
    "Pride Radio",
    "The Hits",  //hits
    "80's to today",
    "2010's",
    "2000's",
    "90's",
    "80's",
    "Classic Rock",
    "Reggae" //reggae
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

    open_new_radio(stations[station_index]);
    lcd_text(station_names[station_index]);
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
      open_new_radio(stations[station_index]);
      lcd_text(station_names[station_index]);
     }
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

//TODO: change to display channel name
void display_music()
{
    int line_step = 24;
    int line = 0;
    char buff[20];
    ;
    sprintf(buff, "RunningTime:%d",runtime);

    display.clearDisplay();

    display.setTextSize(1);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text

    display.setCursor(0, line); // Start at top-left corner
    display.println(stations[station_index]);
    line += line_step * 2;

    display.setCursor(0, line);
    display.println(buff);
    line += line_step;

    display.display();
}

void logoshow(void)
{
    display.clearDisplay();

    display.setTextSize(2);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text
    display.setCursor(0, 0);             // Start at top-left corner
    display.println(F("Will Radio"));
    display.setCursor(0, 20); // Start at top-left corner
    display.println(F("Button for Next"));
    display.setCursor(0, 40); // Start at top-left corner
    display.println(F(""));
    display.display();
    delay(2000);
}

void lcd_text(String text)
{
    display.clearDisplay();

    display.setTextSize(2);              // Normal 1:1 pixel scale
    display.setTextColor(SSD1306_WHITE); // Draw white text
    display.setCursor(0, 0);             // Start at top-left corner
    display.println(text);
    display.display();
    delay(500);
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
