// CCW MUSIC 遊戲按鈕控制
// 使用8個按鈕對應8個音符 (do, re, mi, fa, sol, la, si, do')

const int BUTTON_PINS[] = {2, 3, 4, 5, 6, 7, 8, 9};  // 按鈕接腳 D2-D9
const int NUM_BUTTONS = 8;
volatile byte buttonStates[NUM_BUTTONS];  // 按鈕狀態
unsigned long lastDebounceTime = 0;  // 去抖動時間
const unsigned long DEBOUNCE_DELAY = 50;  // 去抖動延遲（毫秒）

void setup() {
  Serial.begin(9600);
  
  // 設定所有按鈕接腳為輸入，並啟用內建上拉電阻
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
    buttonStates[i] = HIGH;  // 初始狀態為未按下
  }
}

void loop() {
  // 檢查每個按鈕
  for (int i = 0; i < NUM_BUTTONS; i++) {
    byte currentState = digitalRead(BUTTON_PINS[i]);
    
    // 當按鈕狀態改變時
    if (currentState != buttonStates[i]) {
      // 更新去抖動時間
      lastDebounceTime = millis();
      
      // 如果經過去抖動延遲時間後狀態仍然保持
      if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
        // 如果按鈕被按下（因為使用上拉，所以是LOW）
        if (currentState == LOW) {
          // 發送按鈕編號（2-9，對應 do-do'）
          Serial.write(BUTTON_PINS[i]);
        }
        // 更新按鈕狀態
        buttonStates[i] = currentState;
      }
    }
  }
  
  // 短暫延遲以減少 CPU 負載
  delay(1);
}
