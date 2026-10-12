import type { ElectronicsInfo, InfoKey } from './types'
import { airClimate } from './air-climate'
import { airQuality } from './air-quality'
import { light } from './light'
import { soil7in1 } from './soil-7in1'
import { soilMoisture } from './soil-moisture'

export type { ElectronicsInfo, FormulaStep, InfoKey } from './types'

export const electronicsInfo: Record<InfoKey, ElectronicsInfo> = {
  'soil-moisture': soilMoisture,
  'air-climate': airClimate,
  light,
  'air-quality': airQuality,
  'soil-7in1': soil7in1,
}
