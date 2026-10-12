import type { ElectronicsInfo } from './types'
import { fx } from './format'

const DRY = 560
const WET = 240

export const soilMoisture: ElectronicsInfo = {
  key: 'soil-moisture',
  title: 'Humedad de suelo',
  component: {
    name: 'Sensor de suelo 7-en-1 (principal) + sensor capacitivo (respaldo)',
    model: '7-en-1 RS485 Modbus RTU · capacitivo analógico',
    supply: '7-en-1: según su hoja técnica (pendiente de confirmar) · capacitivo: 5 V del Mega',
    interface: '7-en-1: RS485 (holding register 1) · capacitivo: salida analógica al ADC',
    pins: '7-en-1: Serial2 (TX2 D16 / RX2 D17) vía MAX485, DE/RE en D7 · capacitivo: A0',
    notes: [
      'Con USA_7EN1 = 1 (configuración actual) el valor sale del 7-en-1; A0 no se usa.',
      'Valor MEDIDO por el 7-en-1 (calibración de fábrica); el respaldo capacitivo usa calibración propia aire/agua.',
    ],
  },
  principle: [
    'El agua tiene una constante dieléctrica (~80) mucho mayor que el suelo seco (~3–5); al humedecerse el suelo cambia la capacitancia de los electrodos.',
    'El 7-en-1 convierte esa medición internamente y entrega el resultado ya digitalizado en el registro 1, en décimas de porcentaje.',
    'El capacitivo de respaldo entrega un voltaje que BAJA al aumentar la humedad; por eso la calibración va de 560 (aire) a 240 (agua).',
  ],
  formula: {
    general: String.raw`H_{suelo} = \frac{reg_1}{10}\ \%\qquad H_{resp} = \mathrm{map}(crudo,\,560,\,240,\,0,\,100)`,
    variables: [
      { symbol: 'reg_1', meaning: 'Holding register 1 del 7-en-1 (humedad × 10)' },
      { symbol: 'crudo', meaning: 'Cuenta ADC de A0 (0–1023), solo en modo respaldo' },
      { symbol: '560 / 240', meaning: 'Calibración del capacitivo: crudo al aire / en agua' },
    ],
    compute: (frame) => {
      if (frame.suelo_ok !== 1) return null
      const reg1 = Math.round(frame.suelo_h * 10)
      const h = frame.suelo_h
      const rawEquivalent = Math.round(DRY - (h * (DRY - WET)) / 100)
      return [
        {
          tex: String.raw`H_{suelo} = \frac{${reg1}}{10} = ${fx(reg1 / 10, 1)}\ \%`,
          note: 'Medido por el 7-en-1 (registro 1). La trama JSON lo envía redondeado a entero.',
        },
        {
          tex: String.raw`crudo_{eq} \approx 560 - \frac{${fx(h, 0)}\cdot(560-240)}{100} = ${rawEquivalent}`,
          note: 'Referencia didáctica: cuenta que daría el capacitivo de respaldo para la misma humedad (no es una lectura).',
        },
      ]
    },
  },
  signalPath: [
    { stage: 'Sonda en el suelo', detail: 'La humedad cambia la capacitancia entre electrodos.' },
    { stage: '7-en-1', detail: 'Digitaliza y guarda humedad × 10 en el registro 1.' },
    {
      stage: 'RS485 → MAX485',
      detail: 'Par diferencial A/B a 9600 baud; el MAX485 lo pasa a niveles TTL.',
    },
    { stage: 'Mega (Serial2)', detail: 'Lee registros 0–6 cada 2 s y divide reg1 entre 10.' },
    {
      stage: 'Lógica de riego',
      detail: 'Bomba ON si < 30 %, OFF si > 60 % (histéresis), solo si hay agua.',
    },
    { stage: 'Serial1 → ESP32 → nube → web', detail: 'Campo suelo_h de la trama JSON cada 2 s.' },
  ],
  circuit: {
    summary:
      'El 7-en-1 comparte el bus RS485 con el MAX485; el capacitivo de respaldo es un divisor/acondicionador interno con salida a A0.',
    connections: [
      { from: '7-en-1 A/B', to: 'MAX485 A/B', note: 'Par trenzado' },
      { from: 'MAX485 RO / DI', to: 'Mega RX2 (D17) / TX2 (D16)' },
      { from: 'MAX485 DE+RE', to: 'Mega D7' },
      { from: 'Capacitivo AOUT', to: 'Mega A0', note: 'Solo si USA_7EN1 = 0' },
    ],
  },
  commonErrors: [
    'Pensar que más voltaje = más humedad en el capacitivo: es al revés (560 seco, 240 mojado).',
    'Olvidar el constrain(): fuera del rango calibrado map() devuelve valores < 0 % o > 100 %.',
    'Leer suelo_h cuando suelo_ok = 0: el Mega conserva el último valor válido, no es una lectura nueva.',
  ],
}
