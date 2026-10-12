import type { Actuator, Telemetry } from '@inv/contracts'
import { Bell, DoorOpen, Droplets, Fan, Lightbulb, PanelTop, type LucideIcon } from 'lucide-react'

export interface ActuatorDef {
  key: Actuator
  label: string
  icon: LucideIcon
  /** Estado confirmado por la telemetría, en texto. */
  describe: (f: Telemetry) => string
  isActive: (f: Telemetry) => boolean
}

const angle = (deg: number) => (deg > 0 ? `Abierta ${deg}°` : 'Cerrada')

export const ACTUATORS_UI = [
  {
    key: 'bomba',
    label: 'Bomba de riego',
    icon: Droplets,
    describe: (f) => (f.bomba ? 'Encendida' : 'Apagada'),
    isActive: (f) => f.bomba === 1,
  },
  {
    key: 'vent',
    label: 'Ventilador',
    icon: Fan,
    describe: (f) => (f.vent ? 'Encendido' : 'Apagado'),
    isActive: (f) => f.vent === 1,
  },
  {
    key: 'luz',
    label: 'Luz artificial',
    icon: Lightbulb,
    describe: (f) => (f.luz > 0 ? `${f.luz} %` : 'Apagada'),
    isActive: (f) => f.luz > 0,
  },
  {
    key: 'ventana',
    label: 'Ventana',
    icon: PanelTop,
    describe: (f) => angle(f.ventana),
    isActive: (f) => f.ventana > 0,
  },
  {
    key: 'puerta',
    label: 'Puerta',
    icon: DoorOpen,
    describe: (f) => angle(f.puerta),
    isActive: (f) => f.puerta > 0,
  },
  {
    key: 'alarma',
    label: 'Alarma',
    icon: Bell,
    describe: (f) => (f.alarma ? 'Encendida' : 'Apagada'),
    isActive: (f) => f.alarma === 1,
  },
] as const satisfies readonly ActuatorDef[]
