import { FunctionsHttpError } from '@supabase/supabase-js'
import type { RangeKey } from '@/config/analytics'
import { getSupabase } from './client'

const SEND_ERRORS: Record<string, string> = {
  rate_limited: 'Ya se enviaron 5 reportes en la última hora. Intenta más tarde.',
  no_recipients: 'No hay un correo de destino configurado en Supabase (script 17).',
  forbidden: 'Tu usuario está inactivo.',
  unauthorized: 'Tu sesión venció. Vuelve a iniciar sesión.',
  bad_pdf: 'El PDF generado no es válido o pesa más de 2 MB.',
  too_large: 'El PDF pesa más de 2 MB. Prueba con un periodo más corto.',
  not_configured: 'Falta configurar el envío de correo en Supabase (RESEND_API_KEY).',
  send_failed: 'El servicio de correo rechazó el envío. Revisa la función send-report.',
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el PDF'))
    reader.readAsDataURL(blob)
  })
}

/** Envía el PDF a la Edge Function `send-report`; los destinatarios los decide Supabase, no la web. */
export async function sendReport(range: RangeKey, pdf: Blob): Promise<{ recipients: number }> {
  const pdfBase64 = await blobToBase64(pdf)
  const { data, error } = await getSupabase().functions.invoke<{ recipients: number }>(
    'send-report',
    { body: { range, pdf_base64: pdfBase64 } },
  )
  if (error) {
    let code = ''
    if (error instanceof FunctionsHttpError) {
      const body: unknown = await error.context.json().catch(() => null)
      if (body && typeof body === 'object' && 'error' in body) code = String(body.error)
    }
    console.error('[reporte] send-report:', code || error.message)
    throw new Error(SEND_ERRORS[code] ?? 'No se pudo enviar el reporte. Revisa tu conexión.')
  }
  return { recipients: data?.recipients ?? 0 }
}
