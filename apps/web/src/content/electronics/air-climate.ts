import type { ElectronicsInfo } from './types'
import { fx } from './format'

const hex = (n: number) => `\\text{0x${n.toString(16).toUpperCase().padStart(2, '0')}}`

export const airClimate: ElectronicsInfo = {
  key: 'air-climate',
  title: 'Temperatura y humedad del aire',
  component: {
    name: 'Sensor de temperatura y humedad relativa',
    model: 'DHT22 (AM2302)',
    supply: '5 V del Mega',
    interface:
      'Digital, un solo hilo bidireccional (protocolo propietario, no es 1-Wire de Dallas)',
    pins: 'DATA → D2 (con resistencia pull-up)',
    notes: ['Valor MEDIDO. El firmware respeta mínimo 2 s entre lecturas.'],
  },
  principle: [
    'La humedad se mide con un condensador cuyo dieléctrico es un polímero que absorbe vapor de agua; la temperatura con un termistor NTC.',
    'Un microcontrolador interno digitaliza ambas y responde con 40 bits: 16 de humedad × 10, 16 de temperatura × 10 (bit 15 = signo) y 8 de checksum.',
    'Cada bit se codifica por la duración del pulso en alto: corto = 0, largo = 1. El Mega mide esos tiempos en D2.',
  ],
  formula: {
    general: String.raw`H = \frac{RH_{16}}{10}\ \%,\quad T = \frac{T_{15..0}}{10}\ ^\circ\mathrm{C},\quad CS = (b_1+b_2+b_3+b_4)\bmod 256`,
    variables: [
      { symbol: 'RH_{16}', meaning: 'Palabra de 16 bits de humedad (bytes 1 y 2)' },
      { symbol: 'T_{15..0}', meaning: 'Palabra de temperatura; bit 15 = signo negativo' },
      { symbol: 'CS', meaning: 'Byte 5: checksum, debe igualar la suma de los 4 bytes' },
    ],
    compute: (frame) => {
      if (frame.dht_ok !== 1) return null
      const rh = Math.round(frame.aire_h * 10)
      const tAbs = Math.round(Math.abs(frame.aire_t) * 10)
      const tWord = (frame.aire_t < 0 ? 0x8000 : 0) | tAbs
      const bytes = [rh >> 8, rh & 0xff, tWord >> 8, tWord & 0xff]
      const cs = bytes.reduce((a, b) => a + b, 0) & 0xff
      return [
        {
          tex: String.raw`H = \frac{${rh}}{10} = ${fx(rh / 10, 1)}\ \%`,
          note: 'Palabra de humedad reconstruida a partir de la trama.',
        },
        {
          tex: String.raw`T = ${frame.aire_t < 0 ? '-' : ''}\frac{${tAbs}}{10} = ${fx(frame.aire_t, 1)}\ ^\circ\mathrm{C}`,
        },
        {
          tex: String.raw`CS = (${bytes.map(hex).join('+')}) \bmod 256 = ${hex(cs)}`,
          note: 'Checksum que debería llegar en el byte 5 (didáctico; la trama envía la humedad sin decimales).',
        },
      ]
    },
  },
  signalPath: [
    { stage: 'Elemento sensor', detail: 'Capacitor de polímero (humedad) y NTC (temperatura).' },
    { stage: 'MCU interno del DHT22', detail: 'Convierte a digital y arma la trama de 40 bits.' },
    {
      stage: 'Línea DATA (D2)',
      detail: 'El Mega pide lectura bajando la línea; el sensor responde con pulsos.',
    },
    {
      stage: 'Mega',
      detail: 'Librería DHT valida checksum; si falla devuelve NaN y se conserva el valor previo.',
    },
    { stage: 'Lógica', detail: 'Ventilación si T > 30 °C o H > 80 %.' },
    { stage: 'ESP32 → nube → web', detail: 'Campos aire_t (1 decimal) y aire_h (entero).' },
  ],
  circuit: {
    summary:
      'Tres conexiones útiles: VCC, GND y DATA con pull-up a VCC (muchos módulos ya la traen).',
    connections: [
      { from: 'DHT22 VCC', to: '5 V' },
      { from: 'DHT22 DATA', to: 'Mega D2', note: 'Pull-up a VCC (valor según módulo)' },
      { from: 'DHT22 GND', to: 'GND' },
    ],
  },
  commonErrors: [
    'Leer más rápido que cada 2 s: el DHT22 devuelve datos repetidos o NaN.',
    'Confundirlo con el bus 1-Wire de Dallas (DS18B20): son protocolos distintos.',
    'Omitir la pull-up en un sensor sin módulo: la línea queda flotando y el checksum falla.',
  ],
}
