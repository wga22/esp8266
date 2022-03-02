// https://github.com/curiores/ArduinoTutorials/blob/main/encoderControl/part1/part1.ino
//NOTE: PWM must be plugged in!

#include <util/atomic.h> // For the ATOMIC_BLOCK macro

#define ENCA 2 // YELLOW
#define ENCB 3 // WHITE
#define PWM 5
#define IN2 6
#define IN1 7


const int FORWARD = 1;
const int BACKWARD = -1;
const int STOP = 0;

volatile int posi = 0; // specify posi as volatile: https://www.arduino.cc/reference/en/language/variables/variable-scope-qualifiers/volatile/
int pos = 0; 

void setup() {
  Serial.begin(9600);
  pinMode(ENCA,INPUT);
  pinMode(ENCB,INPUT);
  attachInterrupt(digitalPinToInterrupt(ENCA),readEncoder,RISING);
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {    pos = posi;  }
  pinMode(PWM,OUTPUT);
  pinMode(IN1,OUTPUT);
  pinMode(IN2,OUTPUT);
}

void loop() 
{
  //TEST1
  simpleBackAndForth();  

  //TEST2 - move to a position

  
  // Read the position in an atomic block to avoid a potential
  // misread if the interrupt coincides with this code running
  // see: https://www.arduino.cc/reference/en/language/variables/variable-scope-qualifiers/volatile/
}

void simpleBackAndForth()
{
  setMotorByDuration(FORWARD, 1000);
  setMotorByDuration(STOP, 10000);
  setMotorByDuration(BACKWARD, 1000);
  setMotorByDuration(STOP, 10000);
}

void setMotorByDuration(int dir, int duration)
{
  if(dir == FORWARD)
  {
    Serial.print("forward: ");
  }
  else if(dir == BACKWARD)
  {
    Serial.print("forward: ");
  }
  else
  {
    Serial.print("Stopped: ");
  }
  setMotor(dir, 25, PWM, IN1, IN2);
  delay(duration);

  //read volitile 
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { pos = posi;  }
  Serial.println(pos);
}

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
