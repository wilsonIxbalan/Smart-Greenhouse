import type { ElectronicsInfo } from './types'
import { arduinoMap, fx } from './format'

export const light: ElectronicsInfo = {
  key: 'light',
  title: 'Iluminación',
  component: {
    name: 'Sensor de luz ambiental + tira LED 12 V',
    model: 'BH1750 (aún no instalado) · tira LED con MOSFET',
    supply: 'BH1750: según módulo (pendiente) · tira LED: 12 V externa',
    interface: 'BH1750: I2C dirección 0x23 · LED: PWM',
    pins: 'BH1750: SDA D20 / SCL D21 · MOSFET (gate): D4',
    notes: [
      'Con USA_BH1750 = 0 el firmware envía lux = -1 (sin sensor) y la luz no se enciende en modo automático.',
      'Valor MEDIDO cuando el sensor exista; luz % es la salida PWM confirmada por el Mega, no luz medida.',
    ],
  },
  principle: [
    'El BH1750 tiene un fotodiodo cuya corriente es proporcional a la luz incidente; un ADC interno de 16 bits la convierte en una cuenta que se lee por I2C.',
    'La tira LED se regula con PWM: el MOSFET conmuta 12 V muy rápido y el brillo percibido es proporcional al ciclo de trabajo.',
  ],
  formula: {
    general: String.raw`E = \frac{cuenta}{1.2}\ \mathrm{lx}\qquad duty = \frac{luz\%\cdot 255}{100},\quad \bar V = \frac{duty}{255}\cdot 12\ \mathrm{V}`,
    variables: [
      { symbol: 'cuenta', meaning: 'Valor de 16 bits leído del BH1750 (modo alta resolución)' },
      { symbol: 'luz\\%', meaning: 'Nivel de la tira reportado en la trama (0–100)' },
      { symbol: 'duty', meaning: 'Valor de analogWrite(D4, duty), 0–255' },
      { symbol: '\\bar V', meaning: 'Voltaje promedio sobre la tira' },
    ],
    compute: (frame) => {
      if (frame.lux < 0) return null
      const count = Math.round(frame.lux * 1.2)
      const duty = arduinoMap(frame.luz, 0, 100, 0, 255)
      return [
        {
          tex: String.raw`E = \frac{${count}}{1.2} = ${fx(count / 1.2, 0)}\ \mathrm{lx}`,
          note: 'Cuenta reconstruida desde lux (modo H-Resolution, MTreg por defecto).',
        },
        {
          tex: String.raw`duty = \frac{${frame.luz}\cdot 255}{100} = ${duty}`,
          note: 'map() entero del firmware.',
        },
        {
          tex: String.raw`\bar V = \frac{${duty}}{255}\cdot 12 = ${fx((duty / 255) * 12)}\ \mathrm{V}`,
        },
      ]
    },
  },
  signalPath: [
    { stage: 'Fotodiodo BH1750', detail: 'Corriente proporcional a la iluminancia.' },
    { stage: 'ADC interno + I2C', detail: 'El Mega lee 2 bytes en la dirección 0x23.' },
    { stage: 'Lógica', detail: 'Si 0 ≤ lux < 200: duty = 200 (≈78 %); si no, 0.' },
    { stage: 'D4 PWM → MOSFET', detail: 'Conmuta el negativo de la tira de 12 V.' },
    { stage: 'Trama', detail: 'Campos lux y luz = map(duty, 0, 255, 0, 100).' },
  ],
  circuit: {
    summary:
      'BH1750 en el bus I2C compartido con la LCD; la tira LED se alimenta de 12 V y el MOSFET hace de interruptor en el lado bajo.',
    connections: [
      { from: 'BH1750 SDA / SCL', to: 'Mega D20 / D21' },
      {
        from: 'Mega D4',
        to: 'Gate del MOSFET',
        note: 'Resistencias de gate/pull-down según montaje (pendiente de documentar)',
      },
      { from: 'Tira LED (−)', to: 'Drain del MOSFET' },
      { from: 'Source del MOSFET', to: 'GND común con el Mega' },
    ],
  },
  commonErrors: [
    'Interpretar lux = -1 como oscuridad: significa "sin sensor".',
    'No unir las tierras de la fuente de 12 V y del Mega: el MOSFET no conmuta.',
    'Creer que luz % mide la iluminación: es la salida PWM aplicada.',
  ],
}
