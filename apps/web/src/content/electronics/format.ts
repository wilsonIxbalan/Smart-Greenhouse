/** Formatea un número con decimales fijos para KaTeX (punto decimal). */
export function fx(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

export const VREF = 5
export const ADC_MAX = 1023

/** V = ADC · 5 / 1023 (ADC de 10 bits del Mega con referencia AVcc = 5 V). */
export function adcToVolts(adc: number): number {
  return (adc * VREF) / ADC_MAX
}

/** Equivalente a map() de Arduino: aritmética entera, trunca hacia cero. */
export function arduinoMap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin)) + outMin
}
