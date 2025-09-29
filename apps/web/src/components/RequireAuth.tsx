import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

type Props = { children: React.ReactNode }

export default function RequireAuth({ children }: Props) {
  const location = useLocation()
  const [checked, setChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!supabase) {
        setChecked(true)
        setIsAuthed(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setIsAuthed(!!data.session)
      setChecked(true)
    }
    load()

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthed(!!session)
      })
      return () => { sub.subscription.unsubscribe() }
    }
  }, [])

  if (!checked) {
    return null
  }

  if (!isAuthed) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}


