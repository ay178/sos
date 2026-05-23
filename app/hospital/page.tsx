'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { HospitalWithTRS } from '@/types'

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' ') }

function Pill({ color, dot, children }: { color: string; dot?: boolean; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    red:   'bg-red-950 text-red-400 border border-red-500/30',
    amber: 'bg-amber-950 text-amber-400 border border-amber-500/30',
    green: 'bg-green-950 text-green-400 border border-green-500/30',
    blue:  'bg-blue-950 text-blue-400 border border-blue-500/30',
    gray:  'bg-white/5 text-white/40 border border-white/10',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium', colors[color])}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-[dot-pulse_1.4s_ease-in-out_infinite]" />}
      {children}
    </span>
  )
}

interface Alert {
  id: string
  incident_id: string
  severity_tier: string
  eta_min: number
  preparation: Record<string, boolean>
  sent_at: string
  acknowledged: boolean
  incident?: {
    lat: number; lng: number; accident_type?: string;
    victim_count?: string; description?: string; status: string
  }
}

interface HospitalStats {
  icu_beds_available: number
  icu_beds_total: number
  or_rooms_available: number
  has_blood_bank: boolean
  blood_available: string[]
  trs_rank?: number
}

const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-1', incident_id: 'inc-1', severity_tier: 'Critical', eta_min: 7,
    preparation: { icu: true, or: true, blood: true, team: true },
    sent_at: new Date(Date.now() - 2 * 60000).toISOString(), acknowledged: false,
    incident: { lat: 28.5672, lng: 77.21, accident_type: 'Vehicle collision', victim_count: '2–3 people', description: 'High speed highway crash, airbags deployed, unconscious victim', status: 'en_route' }
  },
  {
    id: 'alert-2', incident_id: 'inc-2', severity_tier: 'Serious', eta_min: 12,
    preparation: { icu: false, or: true, blood: true, team: true },
    sent_at: new Date(Date.now() - 18 * 60000).toISOString(), acknowledged: true,
    incident: { lat: 28.6261, lng: 77.2088, accident_type: 'Motorcycle crash', victim_count: '1 person', description: 'Motorcycle vs auto-rickshaw, conscious but injured', status: 'arrived' }
  },
]

const DEMO_STATS: HospitalStats = {
  icu_beds_available: 12, icu_beds_total: 80,
  or_rooms_available: 4, has_blood_bank: true,
  blood_available: ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'],
  trs_rank: 1,
}

export default function HospitalDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS)
  const [stats, setStats] = useState<HospitalStats>(DEMO_STATS)
  const [activeTab, setActiveTab] = useState<'alerts' | 'capacity' | 'history'>('alerts')
  const [icuEdit, setIcuEdit] = useState(false)
  const [icuVal, setIcuVal] = useState(String(DEMO_STATS.icu_beds_available))
  const [orEdit, setOrEdit] = useState(false)
  const [orVal, setOrVal] = useState(String(DEMO_STATS.or_rooms_available))
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(iv)
  }, [])

  function timeAgo(iso: string) {
    const diff = Math.floor((now - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  function acknowledge(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const sevColor = (t: string) => t === 'Critical' ? 'red' : t === 'Serious' ? 'amber' : 'green'
  const statusColor = (s: string) => s === 'en_route' ? 'amber' : s === 'arrived' ? 'green' : 'gray'
  const statusLabel = (s: string) => s === 'en_route' ? 'EN ROUTE' : s === 'arrived' ? 'ARRIVED' : s.toUpperCase()

  const unacked = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white">
      {/* ── TOP NAV ── */}
      <nav className="border-b border-white/8 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0D0D0F]/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-sm">🏥</div>
          <div>
            <div className="font-display font-bold text-sm">AIIMS Trauma Centre</div>
            <div className="font-mono text-xs text-white/40">Hospital Admin Dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unacked > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 border border-red-500/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-[dot-pulse_1.4s_ease-in-out_infinite]" />
              <span className="font-mono text-xs text-red-400">{unacked} ACTIVE ALERT{unacked > 1 ? 'S' : ''}</span>
            </div>
          )}
          <div className="font-mono text-xs text-white/30">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'ICU beds free', value: `${stats.icu_beds_available}/${stats.icu_beds_total}`, sub: 'Available now', color: stats.icu_beds_available > 8 ? 'text-green-400' : stats.icu_beds_available > 3 ? 'text-amber-400' : 'text-red-400' },
            { label: 'OR rooms', value: `${stats.or_rooms_available}/6`, sub: 'Ready', color: stats.or_rooms_available > 2 ? 'text-green-400' : 'text-amber-400' },
            { label: 'TRS rank', value: `#${stats.trs_rank}`, sub: 'New Delhi', color: 'text-blue-400' },
            { label: 'Active alerts', value: String(unacked), sub: 'Unacknowledged', color: unacked > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#1C1C21] border border-white/8 rounded-2xl p-4">
              <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`font-display font-black text-2xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/30 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 bg-[#141417] border border-white/8 rounded-xl p-1 mb-5 w-fit">
          {(['alerts', 'capacity', 'history'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                activeTab === t ? 'bg-[#1C1C21] text-white' : 'text-white/40 hover:text-white/70')}>
              {t === 'alerts' && unacked > 0 ? `Alerts (${unacked})` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── ALERTS TAB ── */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id}
                className={cn('border rounded-2xl overflow-hidden transition-all',
                  !alert.acknowledged ? 'border-red-500/40 bg-red-950/10' : 'border-white/8 bg-[#1C1C21]')}>

                {/* Alert header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Pill color={sevColor(alert.severity_tier)} dot={!alert.acknowledged}>
                      {alert.severity_tier.toUpperCase()}
                    </Pill>
                    <Pill color={statusColor(alert.incident?.status ?? '')}>
                      {statusLabel(alert.incident?.status ?? '')}
                    </Pill>
                    <span className="font-mono text-xs text-white/30">{timeAgo(alert.sent_at)}</span>
                  </div>
                  {!alert.acknowledged ? (
                    <button onClick={() => acknowledge(alert.id)}
                      className="px-4 py-2 bg-green-500 text-black rounded-xl font-display font-bold text-sm hover:bg-green-400 transition-colors">
                      Acknowledge
                    </button>
                  ) : (
                    <Pill color="green">✓ Acknowledged</Pill>
                  )}
                </div>

                {/* Alert body */}
                <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
                  {/* Incident info */}
                  <div className="bg-[#141417] rounded-xl p-4 space-y-2.5">
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Incident details</div>
                    {[
                      ['Type', alert.incident?.accident_type ?? 'Unknown'],
                      ['Victims', alert.incident?.victim_count ?? 'Unknown'],
                      ['ETA', `~${alert.eta_min} minutes`],
                      ['Description', alert.incident?.description ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <span className="text-xs text-white/30 w-20 flex-shrink-0">{k}</span>
                        <span className="text-sm flex-1">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Preparation checklist */}
                  <div className="bg-[#141417] rounded-xl p-4">
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Preparation checklist</div>
                    <div className="space-y-2.5">
                      {[
                        ['Trauma team', alert.preparation.team],
                        ['ICU bed reserved', alert.preparation.icu],
                        ['OR ready', alert.preparation.or],
                        ['Blood supply staged', alert.preparation.blood],
                      ].map(([label, done]) => (
                        <div key={label as string} className="flex items-center gap-3">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                            done ? 'bg-green-950 border border-green-500/40 text-green-400' : 'bg-red-950 border border-red-500/40 text-red-400')}>
                            {done ? '✓' : '!'}
                          </div>
                          <span className="text-sm">{label as string}</span>
                          {!done && <Pill color="red">ACTION NEEDED</Pill>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ETA progress bar */}
                {!alert.acknowledged && alert.incident?.status === 'en_route' && (
                  <div className="px-5 pb-4">
                    <div className="flex justify-between text-xs text-white/30 font-mono mb-1.5">
                      <span>Dispatch time</span>
                      <span>Ambulance arriving in ~{alert.eta_min} min</span>
                    </div>
                    <div className="h-2 bg-[#141417] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full animate-[progress-slide_2s_ease-out_both]" style={{ width: '65%' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">🏥</div>
                <div className="font-display font-bold text-lg mb-1">No active alerts</div>
                <div className="text-sm">Incoming alerts will appear here in real-time</div>
              </div>
            )}
          </div>
        )}

        {/* ── CAPACITY TAB ── */}
        {activeTab === 'capacity' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* ICU beds */}
            <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-bold">ICU beds</div>
                <button onClick={() => setIcuEdit(!icuEdit)}
                  className="text-xs font-mono text-white/40 hover:text-white transition-colors">
                  {icuEdit ? 'Cancel' : 'Update'}
                </button>
              </div>
              <div className="flex items-end gap-2 mb-3">
                {icuEdit ? (
                  <div className="flex items-center gap-2 w-full">
                    <input type="number" value={icuVal} onChange={e => setIcuVal(e.target.value)}
                      className="w-24 px-3 py-2 bg-[#252529] border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-green-500" />
                    <span className="text-white/30 text-sm">/ {stats.icu_beds_total}</span>
                    <button onClick={() => { setStats(s => ({ ...s, icu_beds_available: Number(icuVal) })); setIcuEdit(false) }}
                      className="ml-auto px-4 py-2 bg-green-500 text-black rounded-xl font-bold text-sm">Save</button>
                  </div>
                ) : (
                  <>
                    <span className="font-display font-black text-4xl text-green-400">{stats.icu_beds_available}</span>
                    <span className="text-white/30 text-lg mb-1">/ {stats.icu_beds_total} total</span>
                  </>
                )}
              </div>
              <div className="h-3 bg-[#141417] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${(stats.icu_beds_available / stats.icu_beds_total) * 100}%` }} />
              </div>
              <div className="text-xs text-white/30 mt-2">{Math.round((stats.icu_beds_available / stats.icu_beds_total) * 100)}% available</div>
            </div>

            {/* OR rooms */}
            <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-bold">Operating rooms</div>
                <button onClick={() => setOrEdit(!orEdit)}
                  className="text-xs font-mono text-white/40 hover:text-white transition-colors">
                  {orEdit ? 'Cancel' : 'Update'}
                </button>
              </div>
              <div className="flex items-end gap-2 mb-3">
                {orEdit ? (
                  <div className="flex items-center gap-2 w-full">
                    <input type="number" value={orVal} onChange={e => setOrVal(e.target.value)}
                      className="w-24 px-3 py-2 bg-[#252529] border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-amber-500" />
                    <span className="text-white/30 text-sm">/ 6</span>
                    <button onClick={() => { setStats(s => ({ ...s, or_rooms_available: Number(orVal) })); setOrEdit(false) }}
                      className="ml-auto px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm">Save</button>
                  </div>
                ) : (
                  <>
                    <span className="font-display font-black text-4xl text-amber-400">{stats.or_rooms_available}</span>
                    <span className="text-white/30 text-lg mb-1">/ 6 total</span>
                  </>
                )}
              </div>
              <div className="flex gap-1.5">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className={cn('flex-1 h-8 rounded-lg transition-colors',
                    i <= stats.or_rooms_available ? 'bg-amber-500/70' : 'bg-[#141417]')} />
                ))}
              </div>
            </div>

            {/* Blood bank */}
            <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-5">
              <div className="font-display font-bold mb-4">Blood bank</div>
              <div className="flex flex-wrap gap-2">
                {['A+','A−','B+','B−','O+','O−','AB+','AB−'].map(bg => {
                  const available = stats.blood_available.includes(bg)
                  return (
                    <button key={bg}
                      onClick={() => setStats(s => ({
                        ...s,
                        blood_available: available
                          ? s.blood_available.filter(x => x !== bg)
                          : [...s.blood_available, bg]
                      }))}
                      className={cn('px-3 py-2 rounded-xl text-sm font-mono font-medium transition-all',
                        available ? 'bg-green-950 border border-green-500/40 text-green-400' : 'bg-[#141417] border border-white/8 text-white/30')}>
                      {bg}
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-white/30 mt-3">Tap to toggle availability</div>
            </div>

            {/* TRS breakdown */}
            <div className="bg-[#1C1C21] border border-white/8 rounded-2xl p-5">
              <div className="font-display font-bold mb-4">Your TRS factors</div>
              <div className="space-y-3">
                {[
                  ['ICU capacity', Math.round((stats.icu_beds_available / stats.icu_beds_total) * 100), 'bg-red-500'],
                  ['Trauma level', 100, 'bg-purple-500'],
                  ['Blood supply', Math.round((stats.blood_available.length / 8) * 100), 'bg-blue-500'],
                  ['OR availability', Math.round((stats.or_rooms_available / 6) * 100), 'bg-amber-500'],
                ].map(([label, pct, color]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">{label as string}</span>
                      <span className="font-mono text-white/70">{pct as number}%</span>
                    </div>
                    <div className="h-2 bg-[#141417] rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', color as string)}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="bg-[#1C1C21] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
              <div className="font-display font-bold">Incident history</div>
              <div className="font-mono text-xs text-white/30">Last 7 days</div>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { type: 'Vehicle collision', severity: 'Critical', time: '2h ago', status: 'arrived', outcome: 'Treated' },
                { type: 'Motorcycle crash', severity: 'Serious', time: '5h ago', status: 'arrived', outcome: 'Treated' },
                { type: 'Pedestrian hit', severity: 'Critical', time: '8h ago', status: 'arrived', outcome: 'ICU admit' },
                { type: 'Multi-vehicle', severity: 'Serious', time: '1d ago', status: 'arrived', outcome: 'Discharged' },
                { type: 'Vehicle collision', severity: 'Minor', time: '2d ago', status: 'arrived', outcome: 'Discharged' },
              ].map((row, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{row.type}</div>
                    <div className="font-mono text-xs text-white/30 mt-0.5">{row.time}</div>
                  </div>
                  <Pill color={sevColor(row.severity)}>{row.severity}</Pill>
                  <Pill color="green">{row.outcome}</Pill>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
