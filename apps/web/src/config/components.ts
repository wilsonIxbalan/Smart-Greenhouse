import type { InfoKey } from '@/content/electronics/types'

export type ComponentStatus = 'instalado' | 'pendiente'

export interface HardwareComponent {
  key: string
  name: string
  role: string
  iface: string
  pin: string
  principle: string
  infoKey?: InfoKey
  status?: ComponentStatus
}

/** Catálogo según el mapa de pines del firmware de referencia del Mega. */
export const HARDWARE_COMPONENTS = [
  {
    key: 'dht11',
    name: 'DHT11',
    role: 'Temperatura y humedad del aire',
    iface: 'Digital 1 hilo',
    pin: 'D2',
    principle: 'Termistor + sensor resistivo de humedad; trama serie temporizada.',
    infoKey: 'air-climate',
  },
  {
    key: 'pir',
    name: 'PIR HC-SR501',
    role: 'Presencia (puerta)',
    iface: 'Digital',
    pin: 'D3',
    principle: 'Piroeléctrico: detecta cambios de radiación infrarroja.',
  },
  {
    key: 'led',
    name: 'Tira LED 12 V + MOSFET',
    role: 'Luz artificial',
    iface: 'PWM (analogWrite 0–255)',
    pin: 'D4',
    principle: 'Conmutación por PWM: el ciclo de trabajo fija la tensión media..',
    infoKey: 'light',
  },
  {
    key: 'servo-ventana',
    name: 'Servo ventana',
    role: 'Abre la ventana a 90°',
    iface: 'PWM servo (50 Hz)',
    pin: 'D5',
    principle: 'El ancho de pulso (1–2 ms) fija el ángulo.',
  },
  {
    key: 'servo-puerta',
    name: 'Servo puerta',
    role: 'Abre la puerta a 90°',
    iface: 'PWM servo (50 Hz)',
    pin: 'D6',
    principle: 'El ancho de pulso (1–2 ms) fija el ángulo.',
  },
  {
    key: 'max485',
    name: 'MAX485',
    role: 'Transceptor RS-485',
    iface: 'Serial2 9600 + DE/RE',
    pin: 'DE/RE D7 · TX2 D16 · RX2 D17',
    principle: 'Señal diferencial A/B: inmune al ruido en cable largo.',
    infoKey: 'soil-7in1',
  },
  {
    key: 'rele-bomba',
    name: 'Relé bomba',
    role: 'Bomba de riego',
    iface: 'Digital, activo en bajo',
    pin: 'D8',
    principle: 'Bobina electromagnética aísla el circuito de potencia.',
    infoKey: 'soil-moisture',
  },
  {
    key: 'rele-vent',
    name: 'Relé ventilador',
    role: 'Ventilador',
    iface: 'Digital, activo en bajo',
    pin: 'D9',
    principle: 'Bobina electromagnética aísla el circuito de potencia.',
    infoKey: 'air-climate',
  },
  {
    key: 'buzzer',
    name: 'Buzzer + 2N2222',
    role: 'Alarma sonora',
    iface: 'Digital',
    pin: 'D11',
    principle: 'BJT en corte/saturación como interruptor.',
    infoKey: 'air-quality',
  },
  {
    key: 'piloto',
    name: 'Luz piloto + TIP120',
    role: 'Alarma visual',
    iface: 'Digital',
    pin: 'D12',
    principle: 'Darlington: ganancia alta para cargas mayores.',
    infoKey: 'air-quality',
  },
  {
    key: 'capacitivo',
    name: 'Sensor capacitivo de suelo',
    role: 'Humedad de suelo (respaldo)',
    iface: 'Analógica (ADC)',
    pin: 'A0',
    principle: 'La capacitancia cambia con el agua del suelo.',
    infoKey: 'soil-moisture',
  },
  {
    key: 'flotador',
    name: 'Flotador de nivel',
    role: 'Hay agua en el depósito',
    iface: 'Digital, INPUT_PULLUP',
    pin: 'A1',
    principle: 'Contacto que cierra a GND; pull-up interno da HIGH abierto.',
  },
  {
    key: 'mq135',
    name: 'MQ-135',
    role: 'Calidad del aire',
    iface: 'Analógica (ADC)',
    pin: 'A2',
    principle:
      'Óxido metálico: Rs baja con los gases; divisor con RL integrada en el módulo; 60 s de precalentamiento.',
    infoKey: 'air-quality',
  },
  {
    key: 'mq7',
    name: 'MQ-7',
    role: 'Monóxido de carbono',
    iface: 'Analógica (ADC)',
    pin: 'A3',
    principle:
      'Óxido metálico: Rs baja con el CO; divisor con RL integrada en el módulo; 60 s de precalentamiento..',
    infoKey: 'air-quality',
  },
  {
    key: 'lcd',
    name: 'LCD 16x2 I2C',
    role: 'Pantalla local',
    iface: 'I2C (0x27)',
    pin: 'SDA D20 · SCL D21',
    principle: 'Bus serie de dos hilos con direcciones.',
  },
  {
    key: 'bh1750',
    name: 'BH1750',
    role: 'Iluminancia',
    iface: 'I2C (0x23)',
    pin: 'SDA D20 · SCL D21',
    principle: 'Fotodiodo + ADC interno de 16 bits..',
    infoKey: 'light',
  },
  {
    key: 'soil7',
    name: 'Sensor de suelo 7 en 1',
    role: 'pH aprox., EC, NPK, humedad y temperatura',
    iface: 'RS-485 Modbus (dir. 2)',
    pin: 'Vía MAX485 (A/B)',
    principle:
      'Electrodos + conductividad; respuesta Modbus RTU a 9600. NPK estimado a partir de EC.',
    infoKey: 'soil-7in1',
  },
  {
    key: 'esp32',
    name: 'ESP32',
    role: 'Gateway WiFi',
    iface: 'Serial1 9600 ↔ HTTPS',
    pin: 'TX1 D18 · RX1 D19',
    principle:
      'Recibe JSON por UART y lo publica por HTTPS. El TXS0108E adapta niveles: 5 V del Mega ↔ 3,3 V del ESP32.',
  },
  {
    key: 'rc522',
    name: 'Lector RFID RC522',
    role: 'Abre la puerta con tarjeta',
    iface: 'SPI (13,56 MHz)',
    pin: 'RST D49 · MISO D50 · MOSI D51 · SCK D52 · SS D53',
    principle:
      'La antena induce energía en la tarjeta y lee su UID por acoplamiento magnético. Trabaja a 3,3 V: SS, SCK, MOSI y RST pasan por el TXS0108E.',
  },
] as const satisfies readonly HardwareComponent[]

export interface SignalStage {
  key: string
  title: string
  detail: string
  electronic: boolean
}

/** Etapas de la ruta de la señal, del sensor a la pantalla. */
export const SIGNAL_STAGES = [
  { key: 'sensor', title: 'Sensor', detail: 'Magnitud física → señal eléctrica', electronic: true },
  {
    key: 'cond',
    title: 'Acondicionamiento',
    detail: 'Divisor/ADC 10 bits o bus digital (1 hilo, I2C, RS-485)',
    electronic: true,
  },
  {
    key: 'mega',
    title: 'Arduino Mega',
    detail: 'Lee, decide (aplicarLogica) y arma el JSON',
    electronic: true,
  },
  {
    key: 'uart',
    title: 'UART 9600',
    detail: 'Serial1 (D18/D19) Mega ↔ ESP32 vía TXS0108E (5 V ↔ 3,3 V)',
    electronic: true,
  },
  { key: 'esp32', title: 'ESP32', detail: 'Gateway WiFi', electronic: true },
  { key: 'https', title: 'HTTPS', detail: 'Internet cifrado (TLS)', electronic: false },
  { key: 'cloud', title: 'Nube', detail: 'Base de datos y tiempo real', electronic: false },
  { key: 'web', title: 'Web', detail: 'Esta aplicación', electronic: false },
] as const satisfies readonly SignalStage[]
