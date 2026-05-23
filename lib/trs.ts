import type { Hospital, HospitalWithTRS, SeverityTier, TRSBreakdown } from '@/types'

// Haversine distance in km
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Estimate ETA in minutes from distance + simulated traffic
export function estimateETA(distanceKm: number, hour = new Date().getHours()): number {
  // Rush hour (8-10am, 5-8pm) reduces speed
  const speedKmh = hour >= 8 && hour <= 10 ? 18 : hour >= 17 && hour <= 20 ? 15 : 28
  return Math.round((distanceKm / speedKmh) * 60)
}

// ICU component: availability + total capacity
function icuScore(hospital: Hospital, severity: SeverityTier): number {
  if (severity === 'Minor') return 50 // not critical for minor cases
  const avail = hospital.icu_beds_available
  if (avail === 0) return 0
  if (avail >= 10) return 100
  return Math.round((avail / 10) * 90) + 10
}

// Trauma component: level + presence
function traumaScore(hospital: Hospital, severity: SeverityTier): number {
  if (!hospital.has_trauma_center) return severity === 'Critical' ? 0 : 40
  const levelScore = hospital.trauma_level === 1 ? 100 : hospital.trauma_level === 2 ? 75 : 50
  return levelScore
}

// Blood match component
function bloodScore(hospital: Hospital, victimBloodGroup?: string): number {
  if (!hospital.has_blood_bank) return 20
  if (!victimBloodGroup) return 70 // bank exists, type unknown
  const match = hospital.blood_available.includes(victimBloodGroup)
  if (match) return 100
  // O- is universal donor
  if (hospital.blood_available.includes('O-')) return 85
  return 40
}

// Distance component: closer is better, but penalize if too far for critical
function distanceScore(distanceKm: number, severity: SeverityTier): number {
  if (severity === 'Critical' && distanceKm > 15) return 10
  if (distanceKm <= 2) return 100
  if (distanceKm <= 5) return 85
  if (distanceKm <= 10) return 65
  if (distanceKm <= 20) return 40
  return 20
}

// Traffic / ETA component
function trafficScore(etaMin: number, severity: SeverityTier): number {
  const maxOk = severity === 'Critical' ? 10 : severity === 'Serious' ? 20 : 30
  if (etaMin <= maxOk * 0.4) return 100
  if (etaMin <= maxOk * 0.7) return 80
  if (etaMin <= maxOk) return 60
  return Math.max(0, 60 - (etaMin - maxOk) * 4)
}

// Weights by severity
const WEIGHTS: Record<SeverityTier, Record<string, number>> = {
  Critical: { icu: 0.30, trauma: 0.30, blood: 0.15, distance: 0.10, traffic: 0.15 },
  Serious:  { icu: 0.25, trauma: 0.25, blood: 0.15, distance: 0.15, traffic: 0.20 },
  Minor:    { icu: 0.10, trauma: 0.15, blood: 0.10, distance: 0.30, traffic: 0.35 },
}

export function computeTRS(
  hospital: Hospital,
  incidentLat: number,
  incidentLng: number,
  severity: SeverityTier,
  victimBloodGroup?: string
): HospitalWithTRS {
  const distanceKm = haversineKm(incidentLat, incidentLng, hospital.lat, hospital.lng)
  const etaMin = estimateETA(distanceKm)
  const w = WEIGHTS[severity]

  const breakdown: TRSBreakdown = {
    icu_score:      icuScore(hospital, severity),
    trauma_score:   traumaScore(hospital, severity),
    blood_score:    bloodScore(hospital, victimBloodGroup),
    distance_score: distanceScore(distanceKm, severity),
    traffic_score:  trafficScore(etaMin, severity),
    total: 0,
  }

  breakdown.total = Math.round(
    breakdown.icu_score      * w.icu +
    breakdown.trauma_score   * w.trauma +
    breakdown.blood_score    * w.blood +
    breakdown.distance_score * w.distance +
    breakdown.traffic_score  * w.traffic
  )

  return { ...hospital, trs_score: breakdown.total, trs_breakdown: breakdown, distance_km: distanceKm, eta_min: etaMin }
}

export function rankHospitals(
  hospitals: Hospital[],
  incidentLat: number,
  incidentLng: number,
  severity: SeverityTier,
  victimBloodGroup?: string,
  maxRadiusKm = 30
): HospitalWithTRS[] {
  return hospitals
    .map(h => computeTRS(h, incidentLat, incidentLng, severity, victimBloodGroup))
    .filter(h => h.distance_km <= maxRadiusKm)
    .sort((a, b) => b.trs_score - a.trs_score)
}
