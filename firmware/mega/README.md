# Arduino Mega 2560: control

El Mega **decide**: lee los sensores, aplica umbrales e interlocks, mueve los actuadores y abre la puerta con
RFID. Funciona sin internet. Por `Serial1` manda la trama v1 al ESP32 cada 2 s, recibe comandos
(`#507 BOMBA ON 600`), responde con ACK (`{"ack":507,"ok":1,"cmd":"BOMBA ON 600"}`) y reporta los intentos en el
lector (`{"rfid":"53D80151220001","ok":1}`). El encabezado de `invernadero/invernadero.ino` describe el protocolo
completo, incluidas las líneas `@CARDS` / `@CARD` / `@END` de la lista de tarjetas.

| Carpeta | Contenido |
| --- | --- |
| `invernadero/` | Firmware v3, el que corre en la maqueta |
| `reference/` | Versiones anteriores, solo como referencia |

## Pines

| Pin | Uso | Pin | Uso |
| --- | --- | --- | --- |
| D2 | DHT11 | D11 | Buzzer (2N2222) |
| D3 | PIR (solo informa) | D12 | Luz piloto 12 V (TIP120) |
| D4 | PWM de la tira LED (MOSFET) | D16 / D17 | TX2 / RX2 → MAX485 (7 en 1, Modbus) |
| D5 | Servo de la ventana | D18 / D19 | TX1 / RX1 → TXS0108E → ESP32 |
| D6 | Servo de la puerta | D20 / D21 | I2C: LCD 16x2 (0x27) y BH1750 (0x23) |
| D7 | DE + RE del MAX485 | D49 | RST del RC522 |
| D8 | Relé de la bomba (activo en bajo) | D50 / D51 / D52 / D53 | SPI del RC522: MISO / MOSI / SCK / SDA |
| D9 | Relé del ventilador (activo en bajo) | A0 / A1 / A2 / A3 | Suelo capacitivo (respaldo) / flotador / MQ-135 / MQ-7 |

El RC522 va a 3,3 V. SS, SCK, MOSI y RST salen del Mega a 5 V; si quedan canales libres en el TXS0108E, conviene
pasarlos por ahí.

## Configuración (al inicio del sketch)

| Opción | Valor actual | Para qué |
| --- | --- | --- |
| `USA_MQ7` | `1` | |
| `USA_RFID` / `USA_BH1750` / `USA_7EN1` | `1` | Desactivar un módulo sin tocar el resto |
| `DHTTYPE` | `DHT11` | `DHT22` si se cambia el sensor |
| `LCD_ADDR` | `0x27` | `0x3F` si el escáner I2C dice eso |
| `NIVEL_HAY_AGUA` | `LOW` | Estado de A1 cuando hay agua |
| `PIR_ABRE_PUERTA` | `0` | La puerta se abre por RFID |

## Cargarlo

1. Arduino IDE → placa **Arduino Mega or Mega 2560**.
2. *Library Manager*: **LiquidCrystal I2C**, **DHT sensor library** (Adafruit, con *Adafruit Unified Sensor*),
   **Servo**, **BH1750** y **MFRC522** (GithubCommunity). SPI y EEPROM vienen con el IDE.
3. Abrir `invernadero/invernadero.ino`, subir y abrir el Monitor Serie a **9600**.
4. Probar desde el Monitor: `#1 BOMBA ON 60` → `{"ack":1,"ok":1,"cmd":"BOMBA ON 60"}` y `@LIST` para ver las
   tarjetas.

La primera vez, sin lista grabada en la EEPROM, el Mega usa las 4 tarjetas del equipo (versión 0). En la
siguiente sincronización el ESP32 la reemplaza por la de la web.