import { Plus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUid, isValidUid, normalizeUid } from '@/config/access'

interface AddCardFormProps {
  /** UID que llega desde "Registrar" en una entrada desconocida. */
  prefill: { uid: string; seq: number } | null
  pending: boolean
  onAdd: (uid: string, holder: string, done: () => void) => void
}

export function AddCardForm({ prefill, pending, onAdd }: AddCardFormProps) {
  const [uid, setUid] = useState('')
  const [holder, setHolder] = useState('')
  const [touched, setTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // "Registrar" desde una entrada: copia el UID (ajuste de estado durante el render, sin efecto)
  const [prefillSeq, setPrefillSeq] = useState<number | null>(null)
  if (prefill && prefill.seq !== prefillSeq) {
    setPrefillSeq(prefill.seq)
    setUid(formatUid(prefill.uid))
    setTouched(false)
  }

  useEffect(() => {
    if (!prefill) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    nameRef.current?.focus({ preventScroll: true })
  }, [prefill])

  const normalized = normalizeUid(uid)
  const uidError =
    touched && !isValidUid(normalized)
      ? 'Escribe el UID como lo muestra el lector: 8, 14 o 20 dígitos (ej. 53 D8 01 51 22 00 01).'
      : null
  const nameError = touched && holder.trim() === '' ? 'Escribe de quién es la tarjeta.' : null

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched(true)
    if (!isValidUid(normalized) || holder.trim() === '') return
    onAdd(normalized, holder.trim(), () => {
      setUid('')
      setHolder('')
      setTouched(false)
    })
  }

  return (
    <Card className="gap-4 p-4">
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Agregar tarjeta</h3>
          <p className="text-sm text-muted-foreground">
            Pasa la tarjeta por el lector: aparece en Entradas como desconocida con el botón
            Registrar. También puedes escribir el UID que muestra el Monitor Serial.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-uid">UID de la tarjeta</Label>
          <Input
            id="card-uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="53 D8 01 51 22 00 01"
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 font-mono uppercase"
            aria-invalid={uidError !== null}
            aria-describedby={uidError ? 'card-uid-error' : undefined}
          />
          {uidError && (
            <p id="card-uid-error" className="text-sm text-critical">
              {uidError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-holder">Nombre</Label>
          <Input
            id="card-holder"
            ref={nameRef}
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="Ej. Luis"
            maxLength={60}
            autoComplete="off"
            className="min-h-11"
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'card-holder-error' : 'card-holder-hint'}
          />
          {nameError ? (
            <p id="card-holder-error" className="text-sm text-critical">
              {nameError}
            </p>
          ) : (
            <p id="card-holder-hint" className="text-xs text-muted-foreground">
              La LCD saluda con la primera palabra (máx. 10 letras, sin acentos).
            </p>
          )}
        </div>
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
          <Plus aria-hidden />
          {pending ? 'Agregando…' : 'Agregar tarjeta'}
        </Button>
      </form>
    </Card>
  )
}
