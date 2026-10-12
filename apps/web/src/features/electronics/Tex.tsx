import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

interface TexProps {
  tex: string
  display?: boolean
}

/** Renderiza una expresión KaTeX; si es inválida muestra el texto fuente sin romper la vista. */
export function Tex({ tex, display = false }: TexProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }),
    [tex, display],
  )
  return (
    <span
      className="max-w-full overflow-x-auto text-copper"
      // KaTeX genera el HTML a partir de contenido propio del repo (sin entrada de usuario).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
