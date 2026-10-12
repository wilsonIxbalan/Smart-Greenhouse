import { useEffect, useState } from 'react'
import { TIMING } from '@/config/thresholds'

/** Reloj que se actualiza cada segundo para recalcular "hace X" y datos viejos. */
export function useNow(intervalMs: number = TIMING.clockTickMs): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
