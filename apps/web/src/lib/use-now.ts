import { useEffect, useState } from 'react'
import { TIMING } from '@/config/thresholds'
import { serverNow } from '@/lib/server-clock'

/** Hora del servidor que se actualiza cada segundo (dato viejo, "hace X", cuenta regresiva). */
export function useNow(intervalMs: number = TIMING.clockTickMs): number {
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
