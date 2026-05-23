'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { SeverityTier, HospitalWithTRS, SeverityAnalysis } from '@/types'

type Screen = 'home' | 'intake' | 'analysis' | 'trs' | 'dispatch' | 'family' | 'profile'

// ── Tiny helpers ────────────────────────────────────────────────────────────
function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' ') }
function Pill({ color, dot, children }: { color: string; dot?: boolean; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    red:   'bg-brand-red-dim text-brand-red border border-brand-red/30',
    amber: 'bg-brand-amber-dim text-brand-amber border border-brand-amber/30',
    green: 'bg-brand-green-dim text-brand-green border border-brand-green/30',
    blue:  'bg-brand-blue-dim text-brand-blue border border-brand-blue/30',
    gray:  'bg-surface-3 text-white/40 border border-white/10',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide', colors[color])}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full bg-current animate-[dot-pulse_1.4s_ease-in-out_infinite]')} />}
      {children}
    </span>
  )
}
function Card({ children, className, highlight }: { children: React.ReactNode; className?: string; highlight?: string }) {
  const hl = highlight === 'green' ? 'border-brand-green/40 bg-brand-green-dim/20'
           : highlight === 'red'   ? 'border-brand-red/40'
           : 'border-white/8'
  return <div className={cn('bg-surface-3 border rounded-2xl p-4', hl, className)}>{children}</div>
}
function Btn({ children, onClick, variant = 'primary', disabled, className }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary'|'secondary'|'green'; disabled?: boolean; className?: string
}) {
  const v = variant === 'primary'   ? 'bg-brand-red text-white hover:bg-red-600'
          : variant === 'green'     ? 'bg-brand-green text-black hover:bg-green-400'
          : 'bg-surface-4 text-white border border-white/10 hover:bg-surface-4/70'
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('w-full py-4 rounded-2xl font-display font-bold text-base tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-default', v, className)}>
      {children}
    </button>
  )
}
function Input({ placeholder, value, onChange, className }: { placeholder: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <input
      className={cn('w-full px-4 py-3 bg-surface-4 border border-white/10 rounded-xl text-white placeholder-white/30 font-sans text-sm focus:outline-none focus:border-brand-red transition-colors', className)}
      placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Chip selector ────────────────────────────────────────────────────────────
function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={cn('px-3.5 py-2 rounded-full text-xs font-mono border transition-all',
            value === o
              ? 'bg-brand-red-dim border-brand-red/50 text-brand-red'
              : 'bg-surface-3 border-white/10 text-white/50 hover:border-white/20'
          )}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Map placeholder ──────────────────────────────────────────────────────────
function LiveMap({ showAmbulance = false }: { showAmbulance?: boolean }) {
  return (
    <div className="relative h-44 bg-surface-3 rounded-2xl overflow-hidden border border-white/8">
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)',
        backgroundSize: '28px 28px'
      }} />
      {/* Route */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 176" preserveAspectRatio="none">
        <path d="M76 124 Q120 80 182 70" stroke="rgba(232,53,42,0.35)" strokeWidth="2.5" fill="none" strokeDasharray="8 4"/>
      </svg>
      {/* Hospital */}
      <div className="absolute" style={{ left: '49%', top: '41%', transform: 'translate(-50%,-50%)' }}>
        <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center text-sm shadow-[0_0_12px_rgba(29,185,84,0.4)]">🏥</div>
      </div>
      {/* Pulse */}
      <div className="absolute" style={{ left: '20%', top: '70%' }}>
        <div className="absolute w-10 h-10 rounded-full bg-brand-red/20 map-pulse-anim" style={{ transform: 'translate(-50%,-50%)' }} />
        <svg width="24" height="30" viewBox="0 0 24 32" style={{ transform: 'translate(-50%,-100%)' }}>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#E8352A"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
      {/* Ambulance */}
      {showAmbulance && (
        <div className="absolute w-3 h-3 rounded-full bg-brand-amber border-2 border-surface amb-dot shadow-[0_0_8px_rgba(245,166,35,0.6)]" />
      )}
      <div className="absolute bottom-2.5 left-3">
        <Pill color={showAmbulance ? 'amber' : 'gray'} dot={showAmbulance}>
          {showAmbulance ? 'AMBULANCE LIVE' : 'LOCATION PINNED'}
        </Pill>
      </div>
      <div className="absolute bottom-2.5 right-3 font-mono text-xs text-white/30">New Delhi</div>
    </div>
  )
}

// ── Analysis progress card ───────────────────────────────────────────────────
function SignalCard({ label, color, progress, status }: { label: string; color: string; progress: number; status: string }) {
  const bar: Record<string, string> = { red: 'bg-brand-red', amber: 'bg-brand-amber', blue: 'bg-brand-blue', green: 'bg-brand-green' }
  return (
    <Card>
      <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2">{label}</div>
      <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', bar[color])} style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs text-white/40 mt-2 truncate">{status}</div>
    </Card>
  )
}

// ── Hospital TRS card ────────────────────────────────────────────────────────
function HospitalCard({ h, selected, onClick }: { h: HospitalWithTRS; selected: boolean; onClick: () => void }) {
  const tier = h.trs_score >= 85 ? 'green' : h.trs_score >= 65 ? 'amber' : 'red'
  return (
    <div onClick={onClick} className={cn(
      'rounded-2xl border p-4 mb-2.5 cursor-pointer transition-all',
      selected ? 'border-brand-green/50 bg-brand-green-dim/20' : 'border-white/8 bg-surface-3 hover:border-white/20'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className={cn('font-display font-bold text-sm', selected ? 'text-brand-green' : 'text-white')}>{h.name}</div>
          <div className="text-xs text-white/40 mt-0.5">{h.distance_km.toFixed(1)} km · est. {h.eta_min} min</div>
        </div>
        {selected && <Pill color="green">TOP MATCH</Pill>}
      </div>
      <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden mb-2">
        <div className={cn('h-full rounded-full trs-bar-fill', tier === 'green' ? 'bg-gradient-to-r from-brand-amber to-brand-green' : 'bg-brand-amber')}
          style={{ width: `${h.trs_score}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn('font-mono text-xs font-medium', tier === 'green' ? 'text-brand-green' : 'text-brand-amber')}>TRS {h.trs_score}</span>
        <div className="flex gap-1.5">
          {h.icu_beds_available > 0 && <Pill color="green">ICU ✓</Pill>}
          {h.has_trauma_center && <Pill color="green">Trauma ✓</Pill>}
          {h.has_blood_bank && <Pill color={tier === 'green' ? 'green' : 'amber'}>Blood ✓</Pill>}
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [prev, setPrev] = useState<Screen>('home')
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  // Intake state
  const [accType, setAccType] = useState('')
  const [victims, setVictims] = useState('')
  const [desc, setDesc] = useState('')
  const [photoTaken, setPhotoTaken] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Analysis state
  const [signals, setSignals] = useState({ cv: 0, nlp: 0, loc: 0, fusion: 0 })
  const [cvStatus, setCvStatus] = useState('Scanning image...')
  const [nlpStatus, setNlpStatus] = useState('Parsing text...')
  const [locStatus, setLocStatus] = useState('Reading GPS...')
  const [fusionStatus, setFusionStatus] = useState('Waiting...')
  const [analysis, setAnalysis] = useState<SeverityAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [modelUsed, setModelUsed] = useState(false)

  // TRS state
  const [hospitals, setHospitals] = useState<HospitalWithTRS[]>([])
  const [selectedHosp, setSelectedHosp] = useState<HospitalWithTRS | null>(null)
  const [trsLoading, setTrsLoading] = useState(false)

  // Dispatch state
  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [etaSeconds, setEtaSeconds] = useState(420)
  const [dispatched, setDispatched] = useState(false)
  const [dispatchLoading, setDispatchLoading] = useState(false)

  // Profile state
  const [bloodGroup, setBloodGroup] = useState('B+')
  const [allergies, setAllergies] = useState('Penicillin')
  const [conditions, setConditions] = useState('Type 2 Diabetes')
  const [contactName1, setContactName1] = useState('Priya Sharma')
  const [contactPhone1, setContactPhone1] = useState('+91 98101 XXXXX')
  const [contactName2, setContactName2] = useState('Rahul Sharma')
  const [contactPhone2, setContactPhone2] = useState('+91 98200 XXXXX')

  // Timer
  useEffect(() => {
    if (!startTime) return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [startTime])

  // ETA countdown
  useEffect(() => {
    if (screen !== 'dispatch') return
    const iv = setInterval(() => setEtaSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [screen])

  const timerLabel = `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`
  const etaLabel = `${Math.floor(etaSeconds / 60)}:${String(etaSeconds % 60).padStart(2,'0')}`

  function nav(to: Screen) {
    setPrev(screen)
    setScreen(to)
  }
  function back() {
    setScreen(prev)
    setPrev('home')
  }

  function triggerSOS() {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200])
    setStartTime(Date.now())
    setElapsed(0)
    nav('intake')
  }

  // ── Photo capture: real file picker → base64 ─────────────────────────────
  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1]  // strip data:image/...;base64,
      setImageBase64(b64)
      setPhotoTaken(true)
    }
    reader.readAsDataURL(file)
  }

  const runAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    setModelUsed(false)
    setSignals({ cv: 0, nlp: 0, loc: 0, fusion: 0 })
    setCvStatus(imageBase64 ? 'Running MobileNetV2...' : 'No image — skipping CV')
    setNlpStatus('Parsing text...')
    setLocStatus('Reading GPS...')
    setFusionStatus('Waiting...')
    setAnalysis(null)

    // Animate signal bars as analysis runs
    const animCV  = setTimeout(() => setSignals(s => ({ ...s, cv:  imageBase64 ? 88 : 20 })), 400)
    const animNLP = setTimeout(() => { setSignals(s => ({ ...s, nlp: 76 })); setNlpStatus('High urgency signals') }, 900)
    const animLOC = setTimeout(() => { setSignals(s => ({ ...s, loc: 91 })); setLocStatus('Highway · 80km/h zone') }, 1300)
    const animFUS = setTimeout(() => { setSignals(s => ({ ...s, fusion: 95 })); setFusionStatus('Fusing signals...') }, 1800)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accident_type:  accType || 'Vehicle collision',
          victim_count:   victims || 'Unknown',
          description:    desc,
          image_base64:   imageBase64 ?? undefined,
          photo_captured: photoTaken,
          lat: 28.5672, lng: 77.2100,
          road_type: 'National Highway',
        }),
      })
      const data = await res.json()

      clearTimeout(animCV); clearTimeout(animNLP); clearTimeout(animLOC); clearTimeout(animFUS)

      if (data.success) {
        setAnalysis(data.analysis)
        setModelUsed(!!data.model_used)

        // Update CV bar based on actual model result
        if (data.cv_raw && !data.cv_raw.stub) {
          setSignals(s => ({ ...s, cv: data.cv_raw.confidence }))
          setCvStatus(`MobileNetV2: ${data.cv_raw.severity} (${data.cv_raw.confidence}%)`)
        } else {
          setCvStatus(imageBase64 ? 'Model inference fallback' : 'No image provided')
        }
        setFusionStatus(data.analysis.fusion_note || 'Complete')

        // Create incident record
        try {
          const incRes = await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: 28.5672, lng: 77.2100, accident_type: accType, victim_count: victims, description: desc }),
          })
          const incData = await incRes.json()
          setIncidentId(incData.success ? (incData.incident?.id ?? 'demo-incident-id') : 'demo-incident-id')
        } catch { setIncidentId('demo-incident-id') }
      }
    } catch {
      clearTimeout(animCV); clearTimeout(animNLP); clearTimeout(animLOC); clearTimeout(animFUS)
      setAnalysis({
        severity: 'Critical', score: 8, confidence: 88,
        summary: 'High-velocity collision with structural deformation. Unconscious victim indicates head trauma requiring immediate critical care.',
        cv_finding: 'Severe front-end deformation detected',
        nlp_finding: 'Unconscious victim, high-speed impact',
        location_finding: '80km/h highway, high-energy zone',
        recommendation: 'Level 1 trauma center with ICU required',
      })
      setIncidentId('demo-incident-id')
    }
    setAnalysisLoading(false)
  }, [accType, victims, desc, photoTaken, imageBase64])

  const runTRS = useCallback(async () => {
    if (!analysis) return
    setTrsLoading(true)
    try {
      const res = await fetch('/api/trs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 28.5672, lng: 77.2100, severity: analysis.severity, blood_group: bloodGroup }),
      })
      const data = await res.json()
      if (data.success && data.hospitals?.length > 0) {
        setHospitals(data.hospitals)
        setSelectedHosp(data.hospitals[0])
      } else throw new Error('No hospitals')
    } catch {
      // Demo fallback
      const demo: HospitalWithTRS[] = [
        { id: '1', name: 'AIIMS Trauma Centre', address: 'Ansari Nagar', city: 'New Delhi', phone: '+91-11-26588500', lat: 28.5672, lng: 77.21, icu_beds_total: 80, icu_beds_available: 12, has_trauma_center: true, trauma_level: 1, has_blood_bank: true, blood_available: ['A+','B+','B-','O+','O-','AB+'], or_rooms_available: 6, is_active: true, admin_email: '', trs_score: 91, distance_km: 3.2, eta_min: 7, trs_breakdown: { icu_score:95, trauma_score:100, blood_score:90, distance_score:75, traffic_score:82, total:91 } },
        { id: '2', name: 'Safdarjung Hospital', address: 'Safdarjung', city: 'New Delhi', phone: '+91-11-26707444', lat: 28.5685, lng: 77.2057, icu_beds_total: 60, icu_beds_available: 4, has_trauma_center: true, trauma_level: 2, has_blood_bank: true, blood_available: ['A+','B+','O+','O-'], or_rooms_available: 4, is_active: true, admin_email: '', trs_score: 64, distance_km: 1.8, eta_min: 5, trs_breakdown: { icu_score:45, trauma_score:75, blood_score:60, distance_score:90, traffic_score:85, total:64 } },
        { id: '3', name: 'RML Hospital', address: 'Baba Kharak Singh Marg', city: 'New Delhi', phone: '+91-11-23404329', lat: 28.6261, lng: 77.2088, icu_beds_total: 50, icu_beds_available: 8, has_trauma_center: true, trauma_level: 2, has_blood_bank: true, blood_available: ['A+','B+','B-','O+'], or_rooms_available: 3, is_active: true, admin_email: '', trs_score: 72, distance_km: 4.1, eta_min: 10, trs_breakdown: { icu_score:72, trauma_score:75, blood_score:70, distance_score:65, traffic_score:68, total:72 } },
      ]
      setHospitals(demo)
      setSelectedHosp(demo[0])
    }
    setTrsLoading(false)
  }, [analysis, bloodGroup])

  async function runDispatch() {
    if (!selectedHosp) return
    setDispatchLoading(true)
    setEtaSeconds(selectedHosp.eta_min * 60)
    try {
      if (incidentId && incidentId !== 'demo-incident-id') {
        await fetch('/api/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incident_id: incidentId, hospital_id: selectedHosp.id, eta_min: selectedHosp.eta_min }),
        })
      }
    } catch { /* demo mode */ }
    setDispatched(true)
    setDispatchLoading(false)
    nav('dispatch')
  }

  // Screen transition to analysis → auto-run
  useEffect(() => {
    if (screen === 'analysis') runAnalysis()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // Screen transition to TRS → auto-run
  useEffect(() => {
    if (screen === 'trs') runTRS()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  function resetApp() {
    setScreen('home'); setPrev('home')
    setAccType(''); setVictims(''); setDesc(''); setPhotoTaken(false); setImageBase64(null)
    setAnalysis(null); setHospitals([]); setSelectedHosp(null)
    setIncidentId(null); setDispatched(false); setElapsed(0); setStartTime(null); setModelUsed(false)
    setSignals({ cv: 0, nlp: 0, loc: 0, fusion: 0 })
  }

  // Severity color helpers
  const sevColor = (t?: string) => t === 'Critical' ? 'red' : t === 'Serious' ? 'amber' : 'green'

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-0 md:p-8">
      {/* Phone shell */}
      <div className="relative w-full max-w-[390px] h-screen md:h-[844px] bg-surface overflow-hidden md:rounded-[44px] md:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_40px_120px_rgba(0,0,0,0.9)] flex flex-col">

        {/* Status bar */}
        <div className="flex justify-between items-center px-6 pt-3 pb-2 flex-shrink-0">
          <span className="font-mono text-xs text-white/40">{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false})}</span>
          <span className="text-white/40 text-xs">●●●</span>
        </div>

        {/* ── HOME ── */}
        {screen === 'home' && (
          <div className="flex-1 overflow-y-auto px-5 pb-8 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-white/40 uppercase">RoadSoS AI</div>
                <div className="font-display text-xl font-bold mt-1">Golden Hour System</div>
              </div>
              <Pill color="green" dot>ACTIVE</Pill>
            </div>

            {/* SOS button */}
            <div className="flex justify-center my-6">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <div className="absolute w-52 h-52 rounded-full border border-brand-red/20 animate-[sos-ring_2s_ease-out_infinite]" />
                <div className="absolute w-44 h-44 rounded-full border border-brand-red/15" />
                <button onClick={triggerSOS}
                  className="w-36 h-36 rounded-full bg-brand-red flex flex-col items-center justify-center gap-1 shadow-[0_0_50px_rgba(232,53,42,0.6)] animate-[sos-pulse_2s_ease-in-out_infinite] active:scale-90 transition-transform">
                  <svg width="40" height="40" viewBox="0 0 48 48" fill="white" opacity="0.9"><path d="M24 8C15.16 8 8 15.16 8 24s7.16 16 16 16 16-7.16 16-16S32.84 8 24 8zm0 2c7.73 0 14 6.27 14 14s-6.27 14-14 14S10 31.73 10 24 16.27 10 24 10zm-1 7v9l7.5 4.5 1.5-2.46-6-3.54V17h-3z"/></svg>
                  <span className="text-white font-display font-black text-xl tracking-widest">SOS</span>
                  <span className="text-white/60 font-mono text-[9px] tracking-wider">TAP TO ACTIVATE</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[['4.2m','Avg response','text-brand-amber'],['12','Hospitals linked','text-brand-blue'],['97%','AI accuracy','text-brand-green']].map(([v,l,c])=>(
                <Card key={l} className="text-center py-3 px-2">
                  <div className={`font-display font-black text-xl ${c}`}>{v}</div>
                  <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider mt-1">{l}</div>
                </Card>
              ))}
            </div>

            {/* How it works */}
            <Card className="mb-4">
              <div className="font-display font-bold text-sm mb-3">How it works</div>
              {[
                ['Tap SOS','One tap activates full coordination','bg-brand-red-dim border-brand-red','text-brand-red'],
                ['AI analyzes','Vision + NLP → severity score','bg-brand-amber-dim border-brand-amber','text-brand-amber'],
                ['Best hospital','TRS ranking, not just nearest','bg-brand-blue-dim border-brand-blue','text-brand-blue'],
                ['Family notified','Live location + ETA instantly','bg-brand-green-dim border-brand-green','text-brand-green'],
              ].map(([t,s,bg,tc],i,a)=>(
                <div key={t} className="flex gap-3.5 pb-4 last:pb-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${bg} ${tc}`}>{i+1}</div>
                    {i < a.length-1 && <div className="w-px flex-1 bg-white/8 mt-1" />}
                  </div>
                  <div className="pt-0.5">
                    <div className="font-display font-semibold text-sm">{t}</div>
                    <div className="text-xs text-white/40 mt-0.5">{s}</div>
                  </div>
                </div>
              ))}
            </Card>

            <div className="flex gap-2.5">
              <Btn variant="secondary" onClick={() => nav('profile')} className="text-sm py-3">⚙ Medical profile</Btn>
              <Btn variant="secondary" onClick={() => nav('hospital' as Screen)} className="text-sm py-3">🏥 Hospital admin</Btn>
            </div>
          </div>
        )}

        {/* ── INTAKE ── */}
        {screen === 'intake' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <Pill color="red" dot>SOS ACTIVE</Pill>
                <span className="font-mono text-sm text-white/40">{timerLabel}</span>
              </div>
              <div className="font-display text-xl font-bold">What happened?</div>
              <div className="text-sm text-white/40 mt-1">Help AI assess the situation quickly</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
              {/* Photo */}
              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Accident photo</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
                <button onClick={() => fileInputRef.current?.click()}
                  className={cn('w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                    photoTaken ? 'border-brand-green/60 bg-brand-green-dim/20' : 'border-white/15 bg-surface-3 hover:border-white/30')}>
                  {photoTaken
                    ? <><span className="text-xl">📷</span><span className="text-brand-green text-sm font-medium">Photo captured · tap to retake</span></>
                    : <><span className="text-xl opacity-40">📷</span><span className="text-white/30 text-sm">Tap to capture accident photo</span><span className="text-white/20 text-xs font-mono">Used by AI severity model</span></>}
                </button>
              </div>

              {/* Type */}
              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Type of accident</div>
                <ChipGroup options={['Vehicle collision','Motorcycle crash','Pedestrian hit','Truck / heavy vehicle','Multi-vehicle','Other']}
                  value={accType} onChange={setAccType} />
              </div>

              {/* Victims */}
              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Visible victims</div>
                <ChipGroup options={['1 person','2–3 people','4+ people','Unknown']} value={victims} onChange={setVictims} />
              </div>

              {/* Description */}
              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Quick description</div>
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. car hit divider at high speed, airbags deployed..."
                  className="w-full px-4 py-3 bg-surface-4 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none h-20" />
              </div>

              <Btn onClick={() => nav('analysis')}>Analyze with AI →</Btn>
            </div>
          </div>
        )}

        {/* ── ANALYSIS ── */}
        {screen === 'analysis' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <Pill color="red" dot>ANALYZING</Pill>
                <span className="font-mono text-sm text-white/40">{timerLabel}</span>
              </div>
              <div className="font-display text-xl font-bold">AI Severity Analysis</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <SignalCard label="Computer vision" color="red"   progress={signals.cv}     status={cvStatus} />
                <SignalCard label="NLP parsing"      color="amber" progress={signals.nlp}    status={nlpStatus} />
                <SignalCard label="Location context" color="blue"  progress={signals.loc}    status={locStatus} />
                <SignalCard label="Signal fusion"    color="green" progress={signals.fusion} status={fusionStatus} />
              </div>

              {/* AI Result */}
              <Card className={cn('transition-opacity duration-500', analysis ? 'opacity-100' : 'opacity-30')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">AI assessment</div>
                    {modelUsed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-blue-dim border border-brand-blue/30 text-brand-blue text-[9px] font-mono">
                        🧠 MobileNetV2
                      </span>
                    )}
                  </div>
                  {analysisLoading && !analysis && <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-brand-red animate-spin" />}
                </div>
                {!analysis && analysisLoading && (
                  <div className="flex gap-1">
                    {[0,1,2].map(i=>(
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />
                    ))}
                  </div>
                )}
                {analysis && (
                  <div className="space-y-2 animate-fade-up">
                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
                    <div className="space-y-1.5 pt-1">
                      {[['CV →', analysis.cv_finding, 'text-brand-red'],['NLP →', analysis.nlp_finding, 'text-brand-amber'],['LOC →', analysis.location_finding, 'text-brand-blue']].map(([k,v,c])=>(
                        <div key={k} className="flex gap-2 text-xs">
                          <span className={`font-mono font-medium ${c}`}>{k}</span>
                          <span className="text-white/50">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-xs text-white/25 pt-1">Confidence: {analysis.confidence}%</div>
                    {(analysis as any).fusion_note && (
                      <div className="text-[10px] text-white/20 font-mono pt-1 border-t border-white/5 mt-1">{(analysis as any).fusion_note}</div>
                    )}
                  </div>
                )}
              </Card>

              {/* Severity tier */}
              {analysis && (
                <Card className="animate-fade-up" highlight={sevColor(analysis.severity)}>
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Severity score</div>
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(i=>(
                      <div key={i} className={cn('flex-1 h-2 rounded-sm transition-all duration-500',
                        i <= Math.round((analysis.score / 10) * 5)
                          ? analysis.severity === 'Critical' ? 'bg-brand-red' : analysis.severity === 'Serious' ? 'bg-brand-amber' : 'bg-brand-green'
                          : 'bg-surface-4')} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Pill color={sevColor(analysis.severity)}>{analysis.severity?.toUpperCase()}</Pill>
                    <span className="text-xs text-white/40">{analysis.recommendation}</span>
                  </div>
                  <div className="mt-4">
                    <Btn onClick={() => nav('trs')}>Find best hospital →</Btn>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── TRS ── */}
        {screen === 'trs' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pt-1 pb-3 flex-shrink-0">
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <div className="font-display text-xl font-bold">Hospital Selection</div>
              <div className="text-sm text-white/40 mt-1">Ranked by Trauma Readiness Score</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
              {/* TRS factors */}
              <Card>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">TRS factors for this incident</div>
                <div className="space-y-2">
                  {[
                    ['Severity weight', analysis?.severity === 'Critical' ? 'Critical ×1.5' : analysis?.severity ?? 'Serious', 'red'],
                    ['ICU requirement', analysis?.severity === 'Critical' ? 'Yes' : 'Preferred', 'amber'],
                    ['Blood type priority', bloodGroup || 'Unknown', 'blue'],
                    ['Max ETA allowance', analysis?.severity === 'Critical' ? '10 min' : '20 min', 'green'],
                  ].map(([k,v,c])=>(
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{k}</span>
                      <Pill color={c}>{v}</Pill>
                    </div>
                  ))}
                </div>
              </Card>

              {trsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-brand-red animate-spin" />
                </div>
              )}

              {hospitals.map(h => (
                <HospitalCard key={h.id} h={h} selected={selectedHosp?.id === h.id} onClick={() => setSelectedHosp(h)} />
              ))}

              {selectedHosp && (
                <Btn onClick={runDispatch} disabled={dispatchLoading}>
                  {dispatchLoading ? 'Dispatching...' : `Dispatch to ${selectedHosp.name.split(' ')[0]} →`}
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* ── DISPATCH ── */}
        {screen === 'dispatch' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pt-1 pb-3 flex-shrink-0">
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <div className="flex items-center justify-between">
                <Pill color="amber" dot>EN ROUTE</Pill>
                <span className="font-mono text-sm text-white/40">{etaLabel}</span>
              </div>
              <div className="font-display text-xl font-bold mt-2">Ambulance Dispatched</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
              <LiveMap showAmbulance />

              <Card>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Destination</div>
                <div className="font-display font-bold text-brand-green">{selectedHosp?.name}</div>
                <div className="text-xs text-white/40 mt-1">{selectedHosp?.address}, {selectedHosp?.city} · {selectedHosp?.distance_km.toFixed(1)} km</div>
                <div className="border-t border-white/8 mt-3 pt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-display font-black text-lg text-brand-amber">{Math.max(0,Math.ceil(etaSeconds/60))}</div>
                    <div className="font-mono text-[9px] text-white/30 uppercase">min ETA</div>
                  </div>
                  <div>
                    <div className="font-display font-black text-lg">{selectedHosp?.trs_score}</div>
                    <div className="font-mono text-[9px] text-white/30 uppercase">TRS score</div>
                  </div>
                  <div>
                    <div className="font-display font-black text-lg">ICU</div>
                    <div className="font-mono text-[9px] text-white/30 uppercase">reserved</div>
                  </div>
                </div>
              </Card>

              <Card highlight="green">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Hospital pre-alert</div>
                  <Pill color="green">✓ SENT</Pill>
                </div>
                <div className="space-y-2">
                  {['Trauma team assembled','ICU bed reserved','Blood supply staged','OR team on standby'].map(item=>(
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                      <div className="w-4 h-4 rounded-full bg-brand-green-dim border border-brand-green/50 flex items-center justify-center text-brand-green text-[9px]">✓</div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Btn variant="green" onClick={() => nav('family')}>View family notifications →</Btn>
            </div>
          </div>
        )}

        {/* ── FAMILY ── */}
        {screen === 'family' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pt-1 pb-3 flex-shrink-0">
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <div className="font-display text-xl font-bold">Family Notified</div>
              <div className="text-sm text-white/40 mt-1">Emergency contacts updated live</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
              {/* Contacts */}
              {[{ name: contactName1, phone: contactPhone1, status: 'Seen', color: 'green' }, { name: contactName2, phone: contactPhone2, status: 'Delivered', color: 'amber' }].map(c=>(
                <Card key={c.name} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue-dim flex items-center justify-center text-lg flex-shrink-0">👤</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display font-bold text-sm truncate">{c.name}</div>
                      <Pill color={c.color}>{c.status}</Pill>
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">{c.phone}</div>
                    <div className="font-mono text-xs text-white/20 mt-0.5">SMS + WhatsApp sent</div>
                  </div>
                </Card>
              ))}

              {/* Info shared */}
              <Card>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Information shared</div>
                <div className="space-y-2.5">
                  {[
                    ['📍 Accident location', 'Shared (live)'],
                    ['🏥 Hospital destination', selectedHosp?.name ?? 'AIIMS'],
                    ['🚑 Ambulance ETA', `~${Math.max(0,Math.ceil(etaSeconds/60))} min`],
                    ['⚕️ Severity estimate', analysis?.severity ?? 'Critical'],
                  ].map(([k,v])=>(
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-white/50">{k}</span>
                      <span className="font-mono text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Family live view */}
              <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Family live tracking link</div>
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <LiveMap showAmbulance />
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Accident site → {selectedHosp?.name?.split(' ')[0]}</div>
                    <div className="text-xs text-white/40">Live tracking active</div>
                  </div>
                  <Pill color="green" dot>LIVE</Pill>
                </div>
              </div>

              <Btn variant="green" onClick={resetApp}>✓ Done — Return home</Btn>
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {screen === 'profile' && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pt-1 pb-3 flex-shrink-0">
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <div className="font-display text-xl font-bold">Medical Profile</div>
              <div className="text-sm text-white/40 mt-1">Optional · speeds up emergency treatment</div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
              <Card highlight="blue">
                <div className="text-sm text-brand-blue leading-relaxed">
                  Optional but valuable. Your profile helps hospitals prepare before you arrive. The system works without it.
                </div>
              </Card>

              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Blood group</div>
                <ChipGroup options={['A+','A−','B+','B−','O+','O−','AB+','AB−']} value={bloodGroup} onChange={setBloodGroup} />
              </div>

              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Allergies</div>
                <Input placeholder="e.g. Penicillin, latex..." value={allergies} onChange={setAllergies} />
              </div>

              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Medical conditions</div>
                <Input placeholder="e.g. Diabetes, hypertension..." value={conditions} onChange={setConditions} />
              </div>

              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Emergency contact 1</div>
                <div className="space-y-2">
                  <Input placeholder="Name" value={contactName1} onChange={setContactName1} />
                  <Input placeholder="+91 phone number" value={contactPhone1} onChange={setContactPhone1} />
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Emergency contact 2</div>
                <div className="space-y-2">
                  <Input placeholder="Name" value={contactName2} onChange={setContactName2} />
                  <Input placeholder="+91 phone number" value={contactPhone2} onChange={setContactPhone2} />
                </div>
              </div>

              <Btn onClick={back}>Save profile</Btn>
            </div>
          </div>
        )}

        {/* ── HOSPITAL ADMIN (placeholder) ── */}
        {screen === ('hospital' as Screen) && (
          <div className="flex flex-col h-full animate-fade-up">
            <div className="px-5 pt-1 pb-3 flex-shrink-0">
              <button onClick={back} className="flex items-center gap-1.5 text-sm text-white/40 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
              <div className="font-display text-xl font-bold">Hospital Dashboard</div>
              <div className="text-sm text-white/40 mt-1">Visit /hospital on desktop for full admin view</div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
              <Card highlight="green">
                <div className="text-sm text-brand-green">Full hospital admin dashboard is available at <span className="font-mono">/hospital</span> — designed for desktop use by hospital staff.</div>
              </Card>
              {[
                ['Incoming alerts','2 active','text-brand-red'],
                ['ICU beds available','12 / 80','text-brand-green'],
                ['OR rooms ready','4 / 6','text-brand-amber'],
                ['TRS rank (area)','#1 in New Delhi','text-brand-blue'],
              ].map(([k,v,c])=>(
                <Card key={k}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">{k}</span>
                    <span className={`font-display font-bold text-sm ${c}`}>{v}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
