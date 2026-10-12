/* ============================================================
   INVERNADERO INTELIGENTE - FIRMWARE COMPLETO (Arduino Mega)
   Sensores + logica + LCD + JSON al ESP32 + comandos manuales
   Actualizado 2026-10-02: sensor 7-en-1 RS485 integrado
   (ModbusMaster, 9600 baud, direccion 2, mapa de registros confirmado).
   ============================================================ */
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <Servo.h>

// ---------- CONFIGURACION ----------
#define USA_BH1750   0        // 0 = sin sensor de luz | 1 = cuando lo tengas
#define USA_7EN1     1        // 1 = sensor de suelo 7-en-1 activo (RS485)
#define DHTTYPE      DHT22    // DHT11 si usas ese

// ---------- PINES ----------
#define PIN_DHT      2
#define PIN_PIR      3
#define PIN_LED      4        // PWM (MOSFET tira 12V)
#define PIN_SRV_VENT 5
#define PIN_SRV_PUER 6
#define RS485_DIR    7        // MAX485 DE+RE
#define RELE_BOMBA   8        // activo en bajo
#define RELE_VENT    9        // activo en bajo
#define PIN_BUZZER   11       // buzzer activo via 2N2222
#define PIN_LUZ      12       // luz piloto 12V via TIP120
#define PIN_SUELO    A0       // humedad capacitiva (respaldo si no hay 7-en-1)
#define PIN_NIVEL    A1       // flotador: usar INPUT_PULLUP
#define PIN_MQ135    A2
#define PIN_MQ7      A3

// ---------- CALIBRACION (ajusta con tus pruebas) ----------
#define SUELO_SECO   560      // crudo capacitivo al aire (solo si USA_7EN1 = 0)
#define SUELO_AGUA   240      // crudo capacitivo en agua (solo si USA_7EN1 = 0)
#define UMBRAL_RIEGO     30   // % : riega por debajo
#define UMBRAL_RIEGO_OFF 60   // % : apaga al superar
#define UMBRAL_TEMP      30.0 // C : ventila por encima (aire)
#define UMBRAL_HUM       80.0 // % : ventila por encima (aire)
#define UMBRAL_LUZ       200  // lx : enciende luz por debajo
#define UMBRAL_MQ135     270  // crudo : aire malo por encima
#define UMBRAL_MQ7       160  // crudo : CO alto por encima
// Rangos de aptitud del suelo (pH), ajustables al cultivo
#define PH_APTO_MIN   6.0
#define PH_APTO_MAX   7.5

// ---------- OBJETOS ----------
LiquidCrystal_I2C lcd(0x27, 20, 4);  // 16x2? usa lcd(0x27,16,2)
DHT dht(PIN_DHT, DHTTYPE);
Servo servoVentana, servoPuerta;
#if USA_BH1750
  #include <BH1750.h>
  BH1750 luxMeter;
#endif
#if USA_7EN1
  #include <ModbusMaster.h>
  ModbusMaster nodo7;
  void pre7()  { digitalWrite(RS485_DIR, HIGH); }   // transmitir
  void post7() { digitalWrite(RS485_DIR, LOW);  }   // recibir
#endif

// ---------- ESTADO ----------
float t = 0, h = 0, lux = -1;        // aire (DHT22) + luz
float humSuelo = 0;                  // % humedad de suelo (7-en-1 o capacitivo)
int aire = 0, co = 0;                // MQ-135 / MQ-7 (crudos)
bool hayAgua = true, presencia = false;
bool bomba = false, vent = false, alarma = false;
int  luzPWM = 0, angVentana = 0, angPuerta = 0;
bool modoManual = false;
// Suelo 7-en-1
float sTemp = 0, sPH = 0;
uint16_t sEC = 0, sN = 0, sP = 0, sK = 0;
bool sueloOK = false;                // true si la ultima lectura RS485 fue valida

unsigned long tPantalla = 0, tPublica = 0;
int pantalla = 0;
String buffer = "";

void setup() {
  Serial.begin(9600);     // Monitor + comandos manuales
  Serial1.begin(9600);    // Enlace ESP32
  #if USA_7EN1
    Serial2.begin(9600);  // Sensor 7-en-1 (RS485) - 9600, confirmado
    pinMode(RS485_DIR, OUTPUT);
    digitalWrite(RS485_DIR, LOW);
    nodo7.begin(2, Serial2);          // direccion Modbus 2, confirmada
    nodo7.preTransmission(pre7);
    nodo7.postTransmission(post7);
  #endif
  dht.begin();
  Wire.begin();
  lcd.init(); lcd.backlight();
  #if USA_BH1750
    luxMeter.begin();
  #endif
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_NIVEL, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(RELE_BOMBA, OUTPUT); pinMode(RELE_VENT, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT); pinMode(PIN_LUZ, OUTPUT);
  digitalWrite(RELE_BOMBA, HIGH); digitalWrite(RELE_VENT, HIGH); // apagados
  servoVentana.attach(PIN_SRV_VENT); servoPuerta.attach(PIN_SRV_PUER);
  servoVentana.write(0); servoPuerta.write(0);
  lcd.setCursor(0,0); lcd.print("Invernadero listo");
  delay(1200); lcd.clear();
}

void loop() {
  leerSensores();
  if (!modoManual) aplicarLogica();
  aplicarSalidas();
  atenderSerial();          // comandos manuales
  if (millis() - tPantalla > 2500) { tPantalla = millis(); mostrarLCD(); }
  if (millis() - tPublica  > 2000) { tPublica  = millis(); publicarJSON(); }
}

// ---------- LECTURA ----------
void leerSensores() {
  static unsigned long tDHT = 0, t7 = 0;

  // DHT22 (aire): minimo 2 s entre lecturas
  if (millis() - tDHT > 2000) {
    tDHT = millis();
    float tt = dht.readTemperature();
    float hh = dht.readHumidity();
    if (!isnan(tt)) t = tt;
    if (!isnan(hh)) h = hh;
  }

  // Humedad de suelo: del 7-en-1 si esta activo; si no, capacitivo en A0
  #if USA_7EN1
    if (millis() - t7 > 2000) { t7 = millis(); leer7en1(); }  // humSuelo se asigna dentro
  #else
    int crudo = analogRead(PIN_SUELO);
    humSuelo = constrain(map(crudo, SUELO_SECO, SUELO_AGUA, 0, 100), 0, 100);
  #endif

  hayAgua   = (digitalRead(PIN_NIVEL) == LOW);  // flotador cierra a GND
  aire      = analogRead(PIN_MQ135);
  co        = analogRead(PIN_MQ7);
  presencia = (digitalRead(PIN_PIR) == HIGH);
  #if USA_BH1750
    lux = luxMeter.readLightLevel();
  #endif
}

// ---------- LOGICA AUTOMATICA ----------
void aplicarLogica() {
  // Riego con histeresis y proteccion de bomba (usa humedad de SUELO)
  if (!hayAgua)                        bomba = false;
  else if (humSuelo < UMBRAL_RIEGO)     bomba = true;
  else if (humSuelo > UMBRAL_RIEGO_OFF) bomba = false;
  // Ventilacion por calor/humedad del AIRE (DHT22)
  bool ventilar = (t > UMBRAL_TEMP) || (h > UMBRAL_HUM);
  // Gases
  bool gasMalo = (aire > UMBRAL_MQ135) || (co > UMBRAL_MQ7);
  vent = ventilar || gasMalo;
  angVentana = ventilar ? 90 : 0;
  alarma = gasMalo;
  // Iluminacion (solo si hay sensor de luz; si no, queda apagada en auto)
  #if USA_BH1750
    luzPWM = (lux >= 0 && lux < UMBRAL_LUZ) ? 200 : 0;
  #endif
  // Puerta por presencia (modo vigilancia simple)
  angPuerta = presencia ? 90 : 0;
}

// ---------- APLICAR A LOS PINES ----------
void aplicarSalidas() {
  digitalWrite(RELE_BOMBA, bomba ? LOW : HIGH);   // activo en bajo
  digitalWrite(RELE_VENT,  vent  ? LOW : HIGH);
  analogWrite(PIN_LED, luzPWM);
  servoVentana.write(angVentana);
  servoPuerta.write(angPuerta);
  digitalWrite(PIN_BUZZER, alarma ? HIGH : LOW);
  digitalWrite(PIN_LUZ, alarma ? HIGH : LOW);
}

// ---------- VEREDICTO DE APTITUD DEL SUELO ----------
String aptitudSuelo() {
  #if USA_7EN1
    if (!sueloOK) return "Sin lectura";
    if (sPH >= PH_APTO_MIN && sPH <= PH_APTO_MAX) return "Apto";
    if (sPH >= 5.5 && sPH <= 8.0)                 return "Regular";
    return "No apto";
  #else
    return "N/D";
  #endif
}

// ---------- LCD (rota 4 pantallas) ----------
void mostrarLCD() {
  lcd.clear();
  if (pantalla == 0) {                 // Ambiente
    lcd.setCursor(0,0); lcd.print("Aire T:"); lcd.print(t,1); lcd.print(" H:"); lcd.print(h,0); lcd.print("%");
    #if USA_7EN1
      lcd.setCursor(0,1); lcd.print("Suelo T:"); lcd.print(sTemp,1); lcd.print(" H:"); lcd.print(humSuelo,0); lcd.print("%");
    #else
      lcd.setCursor(0,1); lcd.print("Suelo H:"); lcd.print(humSuelo,0); lcd.print("%");
    #endif
    lcd.setCursor(0,2); lcd.print("Luz:"); lcd.print(lux < 0 ? "N/D" : String((int)lux));
    lcd.setCursor(0,3); lcd.print(modoManual ? "MODO: MANUAL" : "MODO: AUTO");
  } else if (pantalla == 1) {          // Fertilidad del suelo
    #if USA_7EN1
      lcd.setCursor(0,0); lcd.print("pH:"); lcd.print(sPH,1); lcd.print(" EC:"); lcd.print(sEC);
      lcd.setCursor(0,1); lcd.print("N:"); lcd.print(sN); lcd.print(" P:"); lcd.print(sP); lcd.print(" K:"); lcd.print(sK);
      lcd.setCursor(0,2); lcd.print("Suelo: "); lcd.print(aptitudSuelo());
      lcd.setCursor(0,3); lcd.print(hayAgua ? "Agua OK" : "NIVEL BAJO");
    #else
      lcd.setCursor(0,0); lcd.print("Suelo 7en1: OFF");
      lcd.setCursor(0,1); lcd.print("Humedad:"); lcd.print(humSuelo,0); lcd.print("%");
      lcd.setCursor(0,3); lcd.print(hayAgua ? "Agua OK" : "NIVEL BAJO");
    #endif
  } else if (pantalla == 2) {          // Actuadores
    lcd.setCursor(0,0); lcd.print("Bomba:"); lcd.print(bomba?"ON":"OFF");
    lcd.print(" Vent:"); lcd.print(vent?"ON":"OFF");
    lcd.setCursor(0,1); lcd.print("Luz PWM:"); lcd.print(map(luzPWM,0,255,0,100)); lcd.print("%");
    lcd.setCursor(0,2); lcd.print("Vent:"); lcd.print(angVentana); lcd.print(" Puerta:"); lcd.print(angPuerta);
    lcd.setCursor(0,3); lcd.print(modoManual ? "MODO: MANUAL" : "MODO: AUTO");
  } else {                             // Gases / alarma
    lcd.setCursor(0,0); lcd.print("Aire(MQ135):"); lcd.print(aire);
    lcd.setCursor(0,1); lcd.print("CO(MQ7):"); lcd.print(co);
    lcd.setCursor(0,2); lcd.print("Presencia:"); lcd.print(presencia?"SI":"NO");
    lcd.setCursor(0,3); lcd.print(alarma?"** ALARMA **":"Sin alarmas");
  }
  pantalla = (pantalla + 1) % 4;
}

// ---------- SALIDA JSON AL ESP32 ----------
void publicarJSON() {
  String j = "{";
  j += "\"aire_t\":" + String(t,1);          // temperatura aire (DHT22)
  j += ",\"aire_h\":" + String(h,0);          // humedad aire (DHT22)
  j += ",\"suelo_h\":" + String(humSuelo,0);  // humedad de suelo (%)
  #if USA_7EN1
  j += ",\"suelo_t\":" + String(sTemp,1);     // temperatura de suelo
  j += ",\"ph\":" + String(sPH,1);
  j += ",\"ec\":" + String(sEC);
  j += ",\"n\":" + String(sN);
  j += ",\"p\":" + String(sP);
  j += ",\"k\":" + String(sK);
  j += ",\"aptitud\":\"" + aptitudSuelo() + "\"";
  #endif
  j += ",\"lux\":" + String((int)lux);
  j += ",\"aire_mq135\":" + String(aire);
  j += ",\"co\":" + String(co);
  j += ",\"agua\":" + String(hayAgua ? 1 : 0);
  j += ",\"pir\":" + String(presencia ? 1 : 0);
  j += ",\"bomba\":" + String(bomba ? 1 : 0);
  j += ",\"vent\":" + String(vent ? 1 : 0);
  j += ",\"luz\":" + String(map(luzPWM,0,255,0,100));
  j += ",\"alarma\":" + String(alarma ? 1 : 0);
  j += ",\"manual\":" + String(modoManual ? 1 : 0);
  j += "}";
  Serial1.println(j);   // al ESP32
  Serial.println(j);    // y al monitor para verlo
}

// ---------- COMANDOS MANUALES (Monitor Serial o ESP32) ----------
void atenderSerial() {
  while (Serial.available())  procesarChar(Serial.read());
  while (Serial1.available()) procesarChar(Serial1.read());
}
void procesarChar(char c) {
  if (c == '\n' || c == '\r') { if (buffer.length()) ejecutar(buffer); buffer = ""; }
  else buffer += c;
}
void ejecutar(String cmd) {
  cmd.trim(); cmd.toUpperCase();
  if      (cmd == "AUTO")        { modoManual = false; }
  else if (cmd == "BOMBA ON")    { modoManual = true; bomba = true; }
  else if (cmd == "BOMBA OFF")   { modoManual = true; bomba = false; }
  else if (cmd == "VENT ON")     { modoManual = true; vent = true; }
  else if (cmd == "VENT OFF")    { modoManual = true; vent = false; }
  else if (cmd == "ALARMA ON")   { modoManual = true; alarma = true; }
  else if (cmd == "ALARMA OFF")  { modoManual = true; alarma = false; }
  else if (cmd.startsWith("LUZ "))     { modoManual = true; luzPWM = map(constrain(cmd.substring(4).toInt(),0,100),0,100,0,255); }
  else if (cmd.startsWith("VENTANA ")) { modoManual = true; angVentana = constrain(cmd.substring(8).toInt(),0,90); }
  else if (cmd.startsWith("PUERTA "))  { modoManual = true; angPuerta = constrain(cmd.substring(7).toInt(),0,90); }
  else { Serial.print("Comando no reconocido: "); Serial.println(cmd); return; }
  Serial.print("OK -> "); Serial.println(cmd);
}

// ---------- SENSOR 7-EN-1 (RS485 / Modbus) ----------
// Mapa de registros CONFIRMADO (prueba aire/agua, 2026-10-02):
//   reg0 = temperatura /10   reg1 = humedad /10   reg2 = EC (us/cm)
//   reg3 = pH /10            reg4 = N   reg5 = P   reg6 = K  (mg/kg)
#if USA_7EN1
void leer7en1() {
  uint8_t r = nodo7.readHoldingRegisters(0x0000, 7);
  if (r == nodo7.ku8MBSuccess) {
    sTemp    = nodo7.getResponseBuffer(0) / 10.0;  // temperatura de suelo
    humSuelo = nodo7.getResponseBuffer(1) / 10.0;  // humedad de suelo
    sEC      = nodo7.getResponseBuffer(2);         // EC
    sPH      = nodo7.getResponseBuffer(3) / 10.0;  // pH
    sN       = nodo7.getResponseBuffer(4);         // N
    sP       = nodo7.getResponseBuffer(5);         // P
    sK       = nodo7.getResponseBuffer(6);         // K
    sueloOK  = true;
  } else {
    sueloOK = false;   // mantiene el ultimo valor valido; marca lectura fallida
  }
}
#endif
