'use client'
import { useEffect, useState, use } from 'react'

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' ') }

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise — unwrap with use()
  const { id } = use(params)

  const [incident, setIncident] = useState<any>(null)
  const [hospital, setHospital] = useState<any>(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setIncident({
        id, lat: 28.5672, lng: 77.21,
        severity_tier: 'Critical', accident_type: 'Vehicle collision',
        victim_count: '2–3 people', status: 'en_route',
        ambulance_eta_min: 7, created_at: new Date().toISOString(),
      })
      setHospital({ name: 'AIIMS Trauma Centre', address: 'Ansari Nagar, New Delhi', lat: 28.5672, lng: 77.21, trs_score: 91 })
      setEtaSeconds(420)
      setLoading(false)
    }, 800)
  }, [id])

  // ETA countdown
  useEffect(() => {
    if (!etaSeconds) return
    const iv = setInterval(() => setEtaSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [etaSeconds])

  const sevColor = (t: string) => t === 'Critical' ? 'text-red-400' : t === 'Serious' ? 'text-amber-400' : 'text-green-400'
  const sevBg   = (t: string) => t === 'Critical' ? 'bg-red-950 border-red-500/30' : t === 'Serious' ? 'bg-amber-950 border-amber-500/30' : 'bg-green-950 border-green-500/30'

  if (loading) return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-red-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      {/* Header */}
      <div className={cn('px-5 py-4 border-b border-white/8 flex items-center justify-between', incident.status === 'en_route' ? 'bg-amber-950/20' : 'bg-green-950/20')}>
        <div>
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">RoadSoS AI · Live tracking</div>
          <div className="font-display font-bold text-lg mt-0.5">Emergency alert</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 border border-red-500/30 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-[dot-pulse_1.4s_ease-in-out_infinite]" />
          <span className="font-mono text-xs text-red-400">LIVE</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 space-y-4">

        {/* Severity banner */}
        <div className={cn('border rounded-2xl px-5 py-4 flex items-center justify-between', sevBg(incident.severity_tier))}>
          <div>
            <div className={cn('font-display font-black text-2xl', sevColor(incident.severity_tier))}>{incident.severity_tier}</div>
            <div className="text-sm text-white/50 mt-0.5">{incident.accident_type} · {incident.victim_count}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-white/30">Incident time</div>
            <div className="font-mono text-sm">{new Date(incident.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* Map */}
        <div className="relative h-52 bg-[#1C1C21] rounded-2xl overflow-hidden border border-white/8">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)',
            backgroundSize: '28px 28px'
          }} />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 208" preserveAspectRatio="none">
            <path d="M76 148 Q120 96 182 84" stroke="rgba(232,53,42,0.35)" strokeWidth="2.5" fill="none" strokeDasharray="8 4"/>
          </svg>
          {/* Hospital */}
          <div className="absolute" style={{ left: '49%', top: '41%', transform: 'translate(-50%,-50%)' }}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-sm shadow-[0_0_12px_rgba(29,185,84,0.4)]">🏥</div>
          </div>
          {/* Accident pin */}
          <div className="absolute" style={{ left: '20%', top: '71%' }}>
            <div className="absolute w-10 h-10 rounded-full bg-red-500/20" style={{ animation: 'map-pulse 2.2s ease-out infinite', transform: 'translate(-50%,-50%)' }} />
            <svg width="24" height="30" viewBox="0 0 24 32" style={{ transform: 'translate(-50%,-100%)' }}>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#E8352A"/>
              <circle cx="12" cy="12" r="5" fill="white"/>
            </svg>
          </div>
          {/* Ambulance dot */}
          <div
            className="absolute w-3 h-3 rounded-full bg-amber-400 border-2 border-[#1C1C21] shadow-[0_0_8px_rgba(245,166,35,0.6)]"
            style={{ left: '20%', top: '68%', animation: 'amb-track 8s linear infinite' }}
          />
          <div className="absolute bottom-2.5 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-950 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-[dot-pulse_1.4s_ease-in-out_infinite]" />
              AMBULANCE TRACKING
            </span>
          </div>
        </div>

        {/* ETA card */}
        <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-5">
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Live status</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-display font-black text-2xl text-amber-400">{Math.max(0, Math.ceil(etaSeconds / 60))}</div>
              <div className="font-mono text-[9px] text-white/30 uppercase mt-1">min ETA</div>
            </div>
            <div>
              <div className="font-display font-black text-2xl text-blue-400">{hospital.trs_score}</div>
              <div className="font-mono text-[9px] text-white/30 uppercase mt-1">TRS score</div>
            </div>
            <div>
              <div className="font-display font-black text-2xl text-green-400">ICU</div>
              <div className="font-mono text-[9px] text-white/30 uppercase mt-1">reserved</div>
            </div>
          </div>
        </div>

        {/* Hospital */}
        <div className="bg-[#1C1C21] border border-green-500/30 rounded-2xl p-5">
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Destination hospital</div>
          <div className="font-display font-bold text-lg text-green-400">{hospital.name}</div>
          <div className="text-sm text-white/40 mt-1">{hospital.address}</div>
          <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
            {['Trauma team assembled', 'ICU bed reserved', 'Blood supply ready'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-green-950 border border-green-500/40 flex items-center justify-center text-green-400 text-[9px]">✓</div>
                <span className="text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-white/20 font-mono pb-4">
          RoadSoS AI · Powered by Anthropic Claude · This page auto-updates
        </div>
      </div>
    </div>
  )
}
