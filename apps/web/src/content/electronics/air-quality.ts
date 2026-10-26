import { THRESHOLDS } from '@/config/thresholds'
import type { FormulaStep, ElectronicsInfo } from './types'
import { adcToVolts, fx } from './format'

export const MQ135_THRESHOLD = THRESHOLDS.mq135MaxAdc
export const MQ7_THRESHOLD = THRESHOLDS.mq7MaxAdc

function sensorSteps(label: string, adc: number, threshold: number): FormulaStep[] {
  const v = adcToVolts(adc)
  const steps: FormulaStep[] = [
    { tex: String.raw`V_{${label}} = \frac{${adc}\cdot 5}{1023} = ${fx(v)}\ \mathrm{V}` },
  ]
  if (adc > 0) {
    steps.push({
      tex: String.raw`\frac{R_s}{R_L} = \frac{5-${fx(v)}}{${fx(v)}} = ${fx((5 - v) / v)}`,
      note: 'Relación adimensional; sin R_L ni R_0 calibrados no se puede dar ppm.',
    })
  }
  steps.push({
    tex: String.raw`${adc} ${adc > threshold ? '>' : '\\le'} ${threshold}\ (${fx(adcToVolts(threshold))}\ \mathrm{V})`,
    note: adc > threshold ? 'Sobre el umbral: ventilación y alarma.' : 'Bajo el umbral.',
  })
  return steps
}

export const airQuality: ElectronicsInfo = {
  key: 'air-quality',
  title: 'Calidad del aire (gases)',
  component: {
    name: 'Sensores de gas de óxido metálico (SnO₂)',
    model: 'MQ-135 (gases generales: NH₃, NOx, CO₂, humo…) · MQ-7 (monóxido de carbono)',
    supply: '5 V (calentador + circuito); módulos con R_L integrada',
    interface: 'Analógica al ADC de 10 bits',
    pins: 'MQ-135 AOUT → A2 · MQ-7 AOUT → A3',
    notes: [
      'Se muestran CUENTAS ADC SIN CALIBRAR (0–1023), no ppm.',
      'Requieren precalentamiento: las primeras lecturas tras encender no son confiables.',
    ],
  },
  principle: [
    'Un calentador mantiene caliente una capa de SnO₂; en aire limpio el oxígeno adsorbido atrapa electrones y la resistencia R_s es alta.',
    'Los gases reductores (CO, NH₃…) reaccionan con ese oxígeno, liberan electrones y R_s baja.',
    'R_s forma un divisor con la resistencia de carga R_L: si R_s baja, sube el voltaje en R_L que lee el Mega.',
  ],
  formula: {
    general: String.raw`V = \frac{ADC\cdot 5}{1023},\qquad R_s = R_L\cdot\frac{5-V}{V}`,
    variables: [
      { symbol: 'ADC', meaning: 'Cuenta del convertidor (0–1023)' },
      { symbol: 'V', meaning: 'Voltaje en R_L (salida del módulo)' },
      { symbol: 'R_s', meaning: 'Resistencia del sensor (baja con más gas)' },
      { symbol: 'R_L', meaning: 'Resistencia de carga del módulo (valor no documentado)' },
    ],
    compute: (frame) => [
      ...sensorSteps('MQ135', frame.aire_mq135, MQ135_THRESHOLD),
      ...sensorSteps('MQ7', frame.co, MQ7_THRESHOLD),
    ],
  },
  signalPath: [
    { stage: 'Capa SnO₂ caliente', detail: 'R_s cambia con la concentración de gas.' },
    { stage: 'Divisor R_s / R_L', detail: 'Convierte la resistencia en voltaje 0–5 V.' },
    { stage: 'ADC del Mega (A2, A3)', detail: '10 bits: 5 V / 1023 ≈ 4.89 mV por cuenta.' },
    {
      stage: 'Lógica (interlock)',
      detail: `MQ-135 > ${MQ135_THRESHOLD} o MQ-7 > ${MQ7_THRESHOLD} → ventilador y alarma (apaga 20 cuentas abajo, mínimo 10 s encendida; ignora el primer minuto de precalentamiento).`,
    },
    { stage: 'Trama', detail: 'Campos aire_mq135 y co en cuentas crudas.' },
  ],
  circuit: {
    summary:
      'Cada módulo trae calentador, R_L y (a veces) comparador; se usa solo la salida analógica.',
    connections: [
      { from: 'MQ-135 VCC / GND', to: '5 V / GND' },
      { from: 'MQ-135 AOUT', to: 'Mega A2' },
      { from: 'MQ-7 VCC / GND', to: '5 V / GND' },
      { from: 'MQ-7 AOUT', to: 'Mega A3' },
    ],
  },
  commonErrors: [
    'Mostrar "ppm" sin calibrar R_0 en aire limpio ni conocer R_L: las cuentas solo sirven como tendencia y umbral.',
    'Evaluar lecturas durante el precalentamiento: el valor deriva hasta estabilizarse.',
    'El MQ-7 según su hoja técnica usa calentador cíclico (5 V / 1.4 V); aquí se alimenta a 5 V fijo, así que su lectura es solo orientativa.',
    'Alimentar los calentadores desde el pin 5 V con muchas cargas: consumen bastante corriente y hacen caer la referencia del ADC.',
  ],
}
