const int NUM_BUTTONS = 8;
const int BUTTON_PINS[NUM_BUTTONS] = {2, 3, 4, 5, 6, 7, 8, 9};
const int DEBOUNCE_DELAY = 30;

byte lastButtonStates[NUM_BUTTONS] = {HIGH};
byte buttonStates[NUM_BUTTONS] = {HIGH};
unsigned long lastDebounceTime[NUM_BUTTONS] = {0};

void setup() {
    Serial.begin(9600);
    for (int i = 0; i < NUM_BUTTONS; i++) {
        pinMode(BUTTON_PINS[i], INPUT_PULLUP);
    }
}

void loop() {
    unsigned long currentTime = millis();
    
    for (int i = 0; i < NUM_BUTTONS; i++) {
        int reading = digitalRead(BUTTON_PINS[i]);
        
        if (reading != lastButtonStates[i]) {
            lastDebounceTime[i] = currentTime;
        }
        
        if ((currentTime - lastDebounceTime[i]) > DEBOUNCE_DELAY) {
            if (reading != buttonStates[i]) {
                buttonStates[i] = reading;
                if (buttonStates[i] == LOW) {
                    Serial.write(BUTTON_PINS[i]);
                }
            }
        }
        
        lastButtonStates[i] = reading;
    }
}
