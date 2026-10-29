import type { ElectronicsInfo } from './types'
import { arduinoMap, fx } from './format'

export const light: ElectronicsInfo = {
  key: 'light',
  title: 'Iluminación',
  component: {
    name: 'Sensor de luz ambiental + tira LED 12 V',
    model: 'BH1750 · tira LED 12 V con MOSFET',
    supply: 'BH1750: módulo en el bus I2C del Mega · tira LED: fuente externa de 12 V',
    interface: 'BH1750: I2C dirección 0x23 · LED: PWM',
    pins: 'BH1750: SDA D20 / SCL D21 · MOSFET (gate): D4',
    notes: [
      'Instalado y activo (USA_BH1750 = 1). Si el sensor deja de responder, el firmware envía lux = -1 y la luz no se enciende en automático.',
      'lux es un valor MEDIDO; luz % es la salida PWM confirmada por el Mega, no luz medida.',
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
    {
      stage: 'Lógica',
      detail:
        'Si 0 ≤ lux < 100 enciende la tira (brillo mínimo útil: duty 40); apaga sobre 120 lx (histéresis de 20 lx).',
    },
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
        note: 'Resistencia de gate en serie y pull-down a GND para que la tira no encienda al arrancar',
      },
      { from: 'Tira LED (−)', to: 'Drain del MOSFET' },
      { from: 'Source del MOSFET', to: 'GND común con el Mega' },
    ],
  },
  commonErrors: [
    'Interpretar lux = -1 como oscuridad: significa que el sensor no respondió.',
    'No unir las tierras de la fuente de 12 V y del Mega: el MOSFET no conmuta.',
    'Creer que luz % mide la iluminación: es la salida PWM aplicada.',
  ],
}
