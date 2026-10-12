import { THRESHOLDS } from '@/config/thresholds'

/** Entradas de la lógica automática del Mega (aplicarLogica en el firmware). */
export interface LogicInputs {
  airTempC: number
  airHumidity: number
  mq135Adc: number
  mq7Adc: number
}

export interface LogicOutputs {
  ventilar: boolean
  gasMalo: boolean
  vent: boolean
  ventanaDeg: 0 | 90
  alarma: boolean
}

/** ventilar = T > 30 ∨ HR > 80 */
export function shouldVentilate(tempC: number, humidity: number): boolean {
  return tempC > THRESHOLDS.airTempMaxC || humidity > THRESHOLDS.airHumidityMax
}

/** gasMalo = MQ135 > 270 ∨ MQ7 > 160 (cuentas ADC) */
export function isGasBad(mq135Adc: number, mq7Adc: number): boolean {
  return mq135Adc > THRESHOLDS.mq135MaxAdc || mq7Adc > THRESHOLDS.mq7MaxAdc
}

/** Salidas de ventilación y alarma, idénticas al firmware. */
export function ventilationLogic(i: LogicInputs): LogicOutputs {
  const ventilar = shouldVentilate(i.airTempC, i.airHumidity)
  const gasMalo = isGasBad(i.mq135Adc, i.mq7Adc)
  return {
    ventilar,
    gasMalo,
    vent: ventilar || gasMalo,
    ventanaDeg: ventilar ? 90 : 0,
    alarma: gasMalo,
  }
}

/**
 * Riego con histéresis: sin agua → OFF; suelo < 30 → ON; suelo > 60 → OFF;
 * entre ambos umbrales conserva el estado previo.
 */
export function pumpLogic(hasWater: boolean, soilHumidity: number, prevPump: boolean): boolean {
  if (!hasWater) return false
  if (soilHumidity < THRESHOLDS.soilIrrigateOn) return true
  if (soilHumidity > THRESHOLDS.soilIrrigateOff) return false
  return prevPump
}
