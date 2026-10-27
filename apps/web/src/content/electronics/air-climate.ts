import type { ElectronicsInfo } from './types'
import { fx } from './format'

const hex = (n: number) => `\\text{0x${n.toString(16).toUpperCase().padStart(2, '0')}}`

export const airClimate: ElectronicsInfo = {
  key: 'air-climate',
  title: 'Temperatura y humedad del aire',
  component: {
    name: 'Sensor de temperatura y humedad relativa',
    model: 'DHT11',
    supply: '5 V del Mega',
    interface:
      'Digital, un solo hilo bidireccional (protocolo propietario, no es 1-Wire de Dallas)',
    pins: 'DATA → D2 (con resistencia pull-up)',
    notes: [
      'Valor MEDIDO. Rango 0–50 °C (±2 °C) y 20–90 % HR (±5 %), resolución de 1 % en humedad.',
      'El firmware lee cada 2 s y marca dht_ok = 0 tras 3 lecturas fallidas seguidas.',
    ],
  },
  principle: [
    'La humedad se mide con un sensor resistivo cuyo valor cambia con el vapor de agua absorbido; la temperatura con un termistor NTC.',
    'Un microcontrolador interno digitaliza ambas y responde con 40 bits: humedad entera y decimal, temperatura entera y decimal, y 8 bits de checksum.',
    'Cada bit se codifica por la duración del pulso en alto: corto = 0, largo = 1. El Mega mide esos tiempos en D2.',
  ],
  formula: {
    general: String.raw`H = b_1 + \frac{b_2}{10}\ \%,\quad T = b_3 + \frac{b_4}{10}\ ^\circ\mathrm{C},\quad CS = (b_1+b_2+b_3+b_4)\bmod 256`,
    variables: [
      {
        symbol: 'b_1, b_2',
        meaning: 'Humedad: parte entera y decimal (en el DHT11 b₂ suele ser 0)',
      },
      { symbol: 'b_3, b_4', meaning: 'Temperatura: parte entera y décimas' },
      { symbol: 'CS', meaning: 'Byte 5: checksum, debe igualar la suma de los 4 bytes' },
    ],
    compute: (frame) => {
      if (frame.dht_ok !== 1) return null
      const b1 = Math.round(frame.aire_h)
      const tAbs = Math.abs(frame.aire_t)
      const b3 = Math.floor(tAbs)
      const b4 = Math.round((tAbs - b3) * 10) % 10
      const bytes = [b1, 0, b3, b4]
      const cs = bytes.reduce((a, b) => a + b, 0) & 0xff
      return [
        {
          tex: String.raw`H = ${b1} + \frac{0}{10} = ${b1}\ \%`,
          note: 'Byte de humedad reconstruido a partir de la trama.',
        },
        {
          tex: String.raw`T = ${frame.aire_t < 0 ? '-' : ''}(${b3} + \frac{${b4}}{10}) = ${fx(frame.aire_t, 1)}\ ^\circ\mathrm{C}`,
        },
        {
          tex: String.raw`CS = (${bytes.map(hex).join('+')}) \bmod 256 = ${hex(cs)}`,
          note: 'Checksum que debería llegar en el byte 5 (didáctico, calculado con los valores de la trama).',
        },
      ]
    },
  },
  signalPath: [
    { stage: 'Elemento sensor', detail: 'Resistencia sensible a la humedad y NTC (temperatura).' },
    { stage: 'MCU interno del DHT11', detail: 'Convierte a digital y arma la trama de 40 bits.' },
    {
      stage: 'Línea DATA (D2)',
      detail: 'El Mega pide lectura bajando la línea; el sensor responde con pulsos.',
    },
    {
      stage: 'Mega',
      detail: 'Librería DHT valida checksum; si falla devuelve NaN y se conserva el valor previo.',
    },
    {
      stage: 'Lógica',
      detail:
        'Ventila si T > 30 °C o H > 80 %; deja de ventilar 1 °C y 5 % por debajo (histéresis).',
    },
    { stage: 'ESP32 → nube → web', detail: 'Campos aire_t (1 decimal) y aire_h (entero).' },
  ],
  circuit: {
    summary:
      'Tres conexiones útiles: VCC, GND y DATA con pull-up a VCC (muchos módulos ya la traen).',
    connections: [
      { from: 'DHT11 VCC', to: '5 V' },
      { from: 'DHT11 DATA', to: 'Mega D2', note: 'Pull-up a VCC (valor según módulo)' },
      { from: 'DHT11 GND', to: 'GND' },
    ],
  },
  commonErrors: [
    'Leer más rápido que una vez por segundo: el DHT11 devuelve datos repetidos o NaN.',
    'Esperar precisión de décimas: el DHT11 tiene ±2 °C y ±5 % HR (el DHT22 es más preciso).',
    'Confundirlo con el bus 1-Wire de Dallas (DS18B20): son protocolos distintos.',
    'Omitir la pull-up en un sensor sin módulo: la línea queda flotando y el checksum falla.',
  ],
}
