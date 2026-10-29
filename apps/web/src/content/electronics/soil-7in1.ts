import type { ElectronicsInfo } from './types'
import { fx } from './format'

/** CRC-16/Modbus: polinomio 0xA001 (reflejado), valor inicial 0xFFFF. Se envía byte bajo primero. */
export function crc16Modbus(bytes: number[]): number {
  let crc = 0xffff
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1
  }
  return crc
}

export function phAptitude(ph: number): 'APTO' | 'REGULAR' | 'NO_APTO' {
  if (ph >= 6.0 && ph <= 7.5) return 'APTO'
  if (ph >= 5.5 && ph <= 8.0) return 'REGULAR'
  return 'NO_APTO'
}

const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')
export const REQUEST = [0x02, 0x03, 0x00, 0x00, 0x00, 0x07]

export const soil7in1: ElectronicsInfo = {
  key: 'soil-7in1',
  title: 'Suelo 7-en-1 (temperatura, humedad, EC, pH, NPK)',
  component: {
    name: 'Sensor de suelo multiparámetro',
    model: '7-en-1 RS485 Modbus RTU + transceptor MAX485',
    supply: 'Fuente DC externa según su hoja técnica; MAX485 a 5 V del Mega',
    interface: 'RS485 half-duplex, Modbus RTU, 9600 baud, dirección 2',
    pins: 'Serial2: TX2 D16 → DI, RX2 D17 ← RO · DE+RE → D7',
    notes: [
      'Temperatura, humedad, EC y pH: MEDIDOS por el sensor.',
      'N, P, K: ESTIMADOS internamente a partir de la EC (no hay sensor químico de nutrientes) → solo orientativos.',
    ],
  },
  principle: [
    'RS485 transmite cada bit como diferencia de voltaje entre las líneas A y B; el ruido común se cancela, por eso aguanta cables largos en campo.',
    'Es half-duplex: el Mega pone D7 en alto para transmitir la petición y en bajo para escuchar la respuesta del sensor.',
    'Modbus RTU: el Mega pide 7 holding registers desde el 0 (función 03) y el sensor responde con 14 bytes de datos; un CRC-16 detecta errores de transmisión.',
  ],
  formula: {
    general: String.raw`T=\tfrac{reg_0}{10},\ H=\tfrac{reg_1}{10},\ EC=reg_2,\ pH=\tfrac{reg_3}{10},\ N,P,K=reg_{4..6}`,
    variables: [
      { symbol: 'reg_0', meaning: 'Temperatura de suelo × 10 (°C)' },
      { symbol: 'reg_1', meaning: 'Humedad de suelo × 10 (%)' },
      { symbol: 'reg_2', meaning: 'Conductividad eléctrica (µS/cm)' },
      { symbol: 'reg_3', meaning: 'pH × 10' },
      { symbol: 'reg_{4..6}', meaning: 'N, P, K en mg/kg (estimados por EC)' },
    ],
    compute: (frame) => {
      if (frame.suelo_ok !== 1) return null
      const { suelo_t, ph, ec, n, p, k } = frame
      if (
        suelo_t === undefined ||
        ph === undefined ||
        ec === undefined ||
        n === undefined ||
        p === undefined ||
        k === undefined
      )
        return null
      const crc = crc16Modbus(REQUEST)
      const reqHex = [...REQUEST, crc & 0xff, crc >> 8].map(h2).join('\\ ')
      const r0 = Math.round(suelo_t * 10)
      const r1 = Math.round(frame.suelo_h * 10)
      const r3 = Math.round(ph * 10)
      return [
        {
          tex: String.raw`\text{Petición: } \texttt{${reqHex}}`,
          note: 'Dirección 02, función 03, registro 0000, cantidad 0007, CRC-16 (byte bajo primero).',
        },
        { tex: String.raw`T = \frac{${r0}}{10} = ${fx(r0 / 10, 1)}\ ^\circ\mathrm{C}` },
        { tex: String.raw`H = \frac{${r1}}{10} = ${fx(r1 / 10, 1)}\ \%` },
        { tex: String.raw`EC = ${ec}\ \mu\mathrm{S/cm}` },
        {
          tex: String.raw`pH = \frac{${r3}}{10} = ${fx(r3 / 10, 1)} \Rightarrow \text{${phAptitude(r3 / 10)}}`,
          note: 'APTO 6.0–7.5 · REGULAR 5.5–8.0 · fuera: NO APTO.',
        },
        {
          tex: String.raw`N=${n},\ P=${p},\ K=${k}\ \mathrm{mg/kg}`,
          note: 'Estimados a partir de la EC: orientativos, no análisis de laboratorio.',
        },
      ]
    },
  },
  signalPath: [
    { stage: 'Electrodos en el suelo', detail: 'Miden temperatura, humedad, conductividad y pH.' },
    {
      stage: 'MCU del sensor',
      detail: 'Calcula valores y estima NPK desde la EC; los guarda en registros 0–6.',
    },
    {
      stage: 'Mega → MAX485 (D7 alto)',
      detail: 'Envía la petición Modbus por Serial2 a 9600 baud.',
    },
    { stage: 'Sensor → MAX485 (D7 bajo)', detail: 'Responde con los 7 registros + CRC.' },
    {
      stage: 'Mega',
      detail:
        'Verifica CRC (librería ModbusMaster); si falla, suelo_ok = 0 y conserva el último valor.',
    },
    { stage: 'Trama', detail: 'suelo_t, suelo_h, ec, ph, n, p, k y aptitud.' },
  ],
  circuit: {
    summary: 'El MAX485 traduce entre UART TTL del Mega y el par diferencial A/B del sensor.',
    connections: [
      { from: 'Mega TX2 (D16)', to: 'MAX485 DI' },
      { from: 'Mega RX2 (D17)', to: 'MAX485 RO' },
      { from: 'Mega D7', to: 'MAX485 DE + RE (unidos)' },
      { from: 'MAX485 A / B', to: 'Sensor A / B' },
      { from: 'Fuente del sensor', to: 'Sensor VCC / GND', note: 'GND común con el Mega' },
    ],
  },
  commonErrors: [
    'Invertir A y B: no hay respuesta (timeout) y suelo_ok = 0.',
    'No conmutar DE/RE a tiempo: el Mega escucha su propia petición o pierde el inicio de la respuesta.',
    'Presentar NPK como medición: el sensor los estima por EC.',
    'Olvidar dividir entre 10 temperatura, humedad y pH.',
  ],
}
