/*
2022-MAR
Working - simple test
Arduino Uno

*/

#include <QMC5883LCompass.h>

QMC5883LCompass compass;

void setup() {
  Serial.begin(9600);
  compass.init();
}

void loop() 
{
  compass.read();
  
  int a = compass.getAzimuth();
  //byte b = compass.getBearing(a);
  Serial.println(a);
  delay(1000);
}
