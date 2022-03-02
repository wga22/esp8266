// sailing autopilot
// March 2022
// Author: Will Allen
//BOARD in use: Aduino Uno
//NOTE: PWM must be plugged in!

//BEGIN Compass
#include <QMC5883LCompass.h>

//BEGIN encoder/motor
#include <util/atomic.h> // For the ATOMIC_BLOCK macro

#define ENCA 2 // YELLOW
#define ENCB 3 // WHITE
#define PWM 5
#define IN2 6
#define IN1 7

const int FORWARD = 1;
const int BACKWARD = -1;
const int STOP = 0;
const int MAX_ADJUSTMENTS = 10; //starts at halfway point
int clicks = MAX_ADJUSTMENTS/2;
//encoder positions
volatile int posi = 0; // specify posi as volatile: https://www.arduino.cc/reference/en/language/variables/variable-scope-qualifiers/volatile/
int pos = 0; 

//BEGIN Compass
QMC5883LCompass compass;
int targetHeading;
const int HEADING_BUFFER = 10;

void setup()
{
  Serial.begin(9600);

  //BEGIN Compass
  compass.init();
  compass.read();
  targetHeading = compass.getAzimuth();

  //BEGIN encoder/motor
  Serial.begin(9600);
  pinMode(ENCA,INPUT);
  pinMode(ENCB,INPUT);
  attachInterrupt(digitalPinToInterrupt(ENCA),readEncoder,RISING);
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {    pos = posi;  }
  pinMode(PWM,OUTPUT);
  pinMode(IN1,OUTPUT);
  pinMode(IN2,OUTPUT);
  setMotorByDuration(STOP, 100); //make sure motor starting in stopped position
  targetHeading = compass.getAzimuth();
}


void loop()
{
  //BEGIN Compass
  compass.read();
  int heading = compass.getAzimuth();
  logValue("Heading", heading);
  logValue("Target Heading", targetHeading);
 //BEGIN encoder/motor
 //TODO: handle 360 / 0
 //TODO handle MAX and MIN positions
 if(targetHeading > heading + HEADING_BUFFER && clicks <MAX_ADJUSTMENTS )
  {
     setMotorByDuration (FORWARD, 200);
     clicks++;
  }
  else if (targetHeading < heading - HEADING_BUFFER && clicks > 0)
  {
    setMotorByDuration (BACKWARD, 200);
    clicks--;
  }
  delay(200);
}


//utilities
void logValue(String lab, int val)
{
  Serial.print(lab);
  Serial.print(" : ");
  Serial.println(val);
}

void setMotorByDuration(int dir, int duration)
{
  String lab;
  if(dir == FORWARD)
  {
    lab = "Forward";
    digitalWrite(IN1,HIGH);
    digitalWrite(IN2,LOW);
  }
  else if(dir == BACKWARD)
  {
    lab = "Backward";
    digitalWrite(IN1,LOW);
    digitalWrite(IN2,HIGH);
  }
  delay(duration);
  //read volitile 
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { pos = posi;  }
  //logValue(lab, pos );
  //stop the motor
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,LOW);
}

void readEncoder()
{
  int b = digitalRead(ENCB);
  if(b > 0){
    posi++;
  }
  else{
    posi--;
  }
}

/* UNUSED
void setMotor(int dir, int pwmVal, int pwm, int in1, int in2){
  //analogWrite(pwm,pwmVal);
  if(dir == FORWARD){
    digitalWrite(in1,HIGH);
    digitalWrite(in2,LOW);
  }
  else if(dir == BACKWARD){
    digitalWrite(in1,LOW);
    digitalWrite(in2,HIGH);
  }
  else{
    digitalWrite(in1,LOW);
    digitalWrite(in2,LOW);
  }
}
*/
