import { LogIn, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { CenteredScreen } from '@/components/shared/CenteredScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useSignIn } from '@/features/auth/hooks'

const loginSchema = z.object({
  email: z.email({ error: 'Escribe un correo válido.' }),
  password: z.string().min(1, { error: 'Escribe tu contraseña.' }),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string | undefined>>

const fromSchema = z.object({ from: z.string().startsWith('/') })

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const signIn = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  if (auth.status === 'signed-in') {
    const target = fromSchema.safeParse(location.state)
    return <Navigate to={target.success ? target.data.from : '/'} replace />
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const parsed = loginSchema.safeParse({ email: email.trim(), password })
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] })
      return
    }
    setErrors({})
    signIn.mutate(parsed.data)
  }

  const busy = signIn.isPending || auth.status === 'loading'

  return (
    <CenteredScreen>
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby="login-title"
        className="space-y-4 rounded-xl border bg-card p-6"
      >
        <div className="space-y-1">
          <h1 id="login-title" className="text-lg font-semibold">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Las cuentas las crea el administrador; no hay registro público.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-critical">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-critical">
              {errors.password}
            </p>
          )}
        </div>

        {signIn.isError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-critical/50 bg-critical/10 p-3 text-sm"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-critical" />
            {signIn.error.message}
          </p>
        )}

        <Button type="submit" className="min-h-11 w-full" disabled={busy}>
          <LogIn aria-hidden />
          {signIn.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </CenteredScreen>
  )
}
