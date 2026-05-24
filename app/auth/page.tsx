'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth() {
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email for the confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-950 border border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-4">🚨</div>
          <div className="font-display font-black text-2xl">RoadSoS AI</div>
          <div className="text-sm text-white/40 mt-1">Golden Hour Intelligence System</div>
        </div>
        <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex gap-1 bg-[#141417] rounded-xl p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-[#1C1C21] text-white' : 'text-white/40'}`}>
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#252529] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-red-500 transition-colors" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#252529] border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-red-500 transition-colors" />
          {error && <div className="text-red-400 text-sm bg-red-950/50 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-950/50 border border-green-500/20 rounded-xl px-4 py-3">{success}</div>}
          <button onClick={handleAuth} disabled={loading || !email || !password}
            className="w-full py-4 bg-red-500 text-white rounded-xl font-display font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-40">
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button onClick={() => router.push('/')} className="w-full py-3 text-white/30 text-sm hover:text-white/60 transition-colors">
            Continue without account
          </button>
        </div>
      </div>
    </div>
  )
}
