import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setEmail(data.user?.email ?? null)
    }
    load()

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null)
      })
      return () => { sub.subscription.unsubscribe() }
    }
  }, [])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!email) {
    return (
      <a href="/auth" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700">Sign in</a>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <span>{email}</span>
      <button onClick={signOut} className="px-3 py-2 rounded-md text-sm font-medium hover:text-white hover:bg-gray-700">Sign out</button>
    </div>
  )
}
