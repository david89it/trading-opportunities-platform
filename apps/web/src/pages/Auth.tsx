import { useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const reason = useMemo(() => new URLSearchParams(window.location.search).get('reason'), [])

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    if (!supabase) {
      setError('Supabase client not configured')
      return
    }
    const params = new URLSearchParams(window.location.search)
    const from = params.get('from') || '/'
    const redirectTo = new URL(from, window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) setError(error.message)
    else setStatus('Check your email for a magic link to sign in.')
  }

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>
      {reason === 'expired' && (
        <div className="error" style={{ marginBottom: '0.75rem' }}>
          Your session expired. Please sign in again.
        </div>
      )}
      <p style={{ color: 'var(--color-text-secondary)' }}>Use your email to receive a magic link.</p>
      <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: '0.75rem' }}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          style={{ padding: '0.6rem 0.8rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
        />
        <button className="btn btn--primary" type="submit">Send Magic Link</button>
      </form>
      {status && <div style={{ marginTop: '0.75rem', color: 'var(--color-success)' }}>{status}</div>}
      {error && <div style={{ marginTop: '0.75rem', color: 'var(--color-danger)' }}>{error}</div>}
    </div>
  )
}
