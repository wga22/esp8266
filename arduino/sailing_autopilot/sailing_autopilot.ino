/*
sailing autopilot
March 2022
Author: Will Allen
BOARD in use: Aduino Uno
NOTES: 
  PWM must be plugged in!
TODO/FUTURE: 
  add in PID library
  calibrate compass - https://github.com/mprograms/QMC5883LCompass
  allow input of constants
  allow course corrections / reset - button to reset targetHeading
  direction reversal button
  use values from the encoder to confirm position of the wheel
  support reading the location instead of putting in limiter for turn distance---wheel can only turn 45 deg each way

*/
//BEGIN Compass
#include <QMC5883LCompass.h>

//BEGIN encoder/motor
#include <util/atomic.h> // For the ATOMIC_BLOCK macro

#define ENCA 2 // YELLOW
#define ENCB 3 // WHITE
#define PWM 5
#define IN2 6
#define IN1 7

//CONSTANTS
const int FORWARD = 1;
const int BACKWARD = -1;
const int STOP = 0;

// PID constants and store vals
const float kp = 5;
const float kd = 0.20;
const float ki = 0.01;
long prevT = 0;
float prevDelta = 0;
float eintegral = 0;

//NAV adjustments
const int MOVEMENT_DELAY = 400; //time to wait between adjustments
const int HEADING_BUFFER = 4; //degrees of "buffer" to allow for going straight

//encoder positions
volatile int posi = 0; // specify posi as volatile: https://www.arduino.cc/reference/en/language/variables/variable-scope-qualifiers/volatile/
int pos = 0; 
const int ENCODER_MAX_TURN = 6600 / 8;  //6600 bumps (600X11) / (max size of the turn, e.g. 5=20%)

//BEGIN Compass
QMC5883LCompass compass;
int targetHeading;

void setup()
{
  delay(1000); //take a breath at bootup
  Serial.begin(9600);

  //BEGIN encoder/motor
  pinMode(ENCA,INPUT);
  pinMode(ENCB,INPUT);
  attachInterrupt(digitalPinToInterrupt(ENCA),readEncoder,RISING);
  pinMode(PWM,OUTPUT);
  pinMode(IN1,OUTPUT);
  pinMode(IN2,OUTPUT);
  setMotorByDuration(STOP, 100); //make sure motor starting in stopped position

  //BEGIN Compass
  compass.init();
  compass.setCalibration(-2606, 463, -810, 1901, -1555, 1225);
  compass.setSmoothing(4, false); //1-10 are valid values, 10 means collect most points for average
  delay(1000);  //take a breath to give chance for compass
  compass.read();
  targetHeading = compass.getAzimuth();
  //logValue("targetHeading", targetHeading);  
}


void loop()
{
  //BEGIN Compass
  compass.read();
  int heading = compass.getAzimuth();
  //logValue("Heading(" + String(targetHeading) + ")", heading);
 
 //BEGIN encoder/motor
 //TODO: handle 360 / 0 overlap
 //TODO handle MAX and MIN positions
 ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {    pos = posi;  }

 //negative numbers mean turn left
 //most cases the target and heading are on same part of compass or south
 int delta = getDelta(targetHeading, heading);
 //logValue("Heading Delta", delta);
 //the bigger the delta, the bigger the motor movement
 //TODO: generate dur via PID: 

 //int dur = simpleDurationCalc(delta);
 int dur = calcPIDDuration(delta);
 
 //turn right
 //if should turn
 if(abs(delta) > HEADING_BUFFER)
 {
   //logValue("encoder pos", pos);
   if(delta > 0 && pos < ENCODER_MAX_TURN)  //turn right
    {
       logValue("DUR", dur);
       setMotorByDuration (FORWARD , dur);
    }
    else if (delta < 0 && pos > (-1*ENCODER_MAX_TURN)) //turn left
    {
      logValue("DUR", (-1*dur));
      setMotorByDuration (BACKWARD, dur);
    }  
 }
  delay(MOVEMENT_DELAY);    //pause between each adjustment to give time for it to have an effect
}

int calcPIDDuration(int delta)
{
/*
 * float kp = 1000;    
 * float kd = 0.025;
 * float ki = 0.0;
 * long prevT = 0;    //previous timeslot
 * float prevDelta = 0;   //previous "delta"
 * float eintegral = 0;
 */

  //get time diff
  long currT = micros();
  float deltaT = ((float) (currT - prevT))/( 1.0e6 );
  // derivative
  float dedt = (delta-prevDelta)/(deltaT);
  // integral
  eintegral = eintegral + delta*deltaT;
  //logValue("dedt", dedt);
  // control signal
  float u = kp*delta + kd*dedt + ki*eintegral;

  //set values for next cycle
  prevDelta = delta;
  prevT = currT;

  return (int)round(abs(u));
}

/* Unused
const int MOVEMENT_DURATION = 80;  //duration of motor adjustment, this will be multiplied by a factor when heading delta grows
int simpleDurationCalc(int delta)
{
  int retVal = (round(MOVEMENT_DURATION * abs(delta)/10)); 
  return retVal;
}
*/

//find how many degrees we are off from target heading, account for 360 == 0 north
int getDelta(int targetHeading, int heading)
{
 int delta = targetHeading - heading;
 //both values are north, and opposite sides of north
 //account for target to the left of north
 if( targetHeading > 270 && heading < 90 )
 {
    delta = (360 - targetHeading + heading)*-1;//turn left, so ensure negative
 }
 //account for target to the right of north
 else if(heading > 270 && targetHeading < 90 )
 {
    delta = 360 - heading + targetHeading;//turn right, so will be positive
 }
  return delta;
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
