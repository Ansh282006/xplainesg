import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'signin' | 'signup'

export function Login() {
  const { session, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/dashboard', { replace: true })
      } else {
        await signUp(email, password, fullName, organization || undefined)
        setNotice('Account created. If email confirmation is enabled, check your inbox before signing in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
            X
          </div>
          <span className="font-semibold">XplainESG</span>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold leading-snug">
            Explainable ESG intelligence for accountable decision-making.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-brand-100">
            Every prediction is traceable to features, evidence and a human reviewer.
            Research prototype — not a certified ESG rating.
          </p>
        </div>
        <p className="text-xs text-brand-200">
          Responsible AI · Human-in-the-loop · Audit trail
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {mode === 'signin' ? 'Sign in' : 'Create an account'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'signin'
              ? 'Access the XplainESG analysis workspace.'
              : 'New accounts start with the viewer role.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label" htmlFor="fullName">Full name</label>
                  <Input id="fullName" className="mt-1" value={fullName}
                         onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="organization">Organization</label>
                  <Input id="organization" className="mt-1" value={organization}
                         onChange={(e) => setOrganization(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <Input id="email" type="email" autoComplete="email" className="mt-1"
                     value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <Input id="password" type="password"
                     autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                     className="mt-1" minLength={6}
                     value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-eco-200 bg-eco-50 px-3 py-2 text-sm text-eco-800">
                {notice}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signin' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              type="button"
              className="font-medium text-brand-700 hover:underline"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null); setNotice(null)
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
