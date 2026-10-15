import type { Actuator, Telemetry } from '@inv/contracts'
import { Bell, DoorOpen, Droplets, Fan, Lightbulb, PanelTop, type LucideIcon } from 'lucide-react'

/** Cómo se controla: coincide con los tipos de comando del contrato (switch, level, angle). */
export type ActuatorControl =
  | { kind: 'switch' }
  | { kind: 'level'; min: number; max: number; step: number }
  | { kind: 'angle'; presets: readonly number[] }

export interface ActuatorDef {
  key: Actuator
  label: string
  icon: LucideIcon
  control: ActuatorControl
  /** Valor confirmado por la telemetría (0/1, % o grados). */
  value: (f: Telemetry) => number
  /** Valor en texto, para la tarjeta y la descripción de un comando. */
  format: (value: number) => string
  /** BR-C07: si devuelve texto, el comando pide confirmación explícita antes de enviarse. */
  confirm?: (value: number) => string | null
}

const onOff = (on: string, off: string) => (v: number) => (v ? on : off)
const angle = (deg: number) => (deg > 0 ? `Abierta ${deg}°` : 'Cerrada')

export const ACTUATORS_UI: readonly ActuatorDef[] = [
  {
    key: 'bomba',
    label: 'Bomba de riego',
    icon: Droplets,
    control: { kind: 'switch' },
    value: (f) => f.bomba,
    format: onOff('Encendida', 'Apagada'),
    confirm: (v) =>
      v
        ? 'La bomba regará en modo manual aunque el suelo esté húmedo. Si el depósito no tiene agua, el Mega rechazará el comando.'
        : null,
  },
  {
    key: 'vent',
    label: 'Ventilador',
    icon: Fan,
    control: { kind: 'switch' },
    value: (f) => f.vent,
    format: onOff('Encendido', 'Apagado'),
  },
  {
    key: 'luz',
    label: 'Luz artificial',
    icon: Lightbulb,
    control: { kind: 'level', min: 0, max: 100, step: 5 },
    value: (f) => f.luz,
    format: (v) => (v > 0 ? `${v} %` : 'Apagada'),
  },
  {
    key: 'ventana',
    label: 'Ventana',
    icon: PanelTop,
    control: { kind: 'angle', presets: [0, 45, 90] },
    value: (f) => f.ventana,
    format: angle,
  },
  {
    key: 'puerta',
    label: 'Puerta',
    icon: DoorOpen,
    control: { kind: 'angle', presets: [0, 45, 90] },
    value: (f) => f.puerta,
    format: angle,
    confirm: (v) =>
      v > 0
        ? `El servo abrirá la puerta a ${v}°. Verifica que no haya nada en su recorrido.`
        : null,
  },
  {
    key: 'alarma',
    label: 'Alarma',
    icon: Bell,
    control: { kind: 'switch' },
    value: (f) => f.alarma,
    format: onOff('Encendida', 'Apagada'),
    confirm: (v) => (v ? 'La alarma (buzzer y LED) sonará en el invernadero.' : null),
  },
]
