export type SeverityTier = 'Critical' | 'Serious' | 'Minor'

export interface Hospital {
  id: string
  name: string
  address: string
  city: string
  phone: string
  lat: number
  lng: number
  icu_beds_total: number
  icu_beds_available: number
  has_trauma_center: boolean
  trauma_level: number
  has_blood_bank: boolean
  blood_available: string[]
  or_rooms_available: number
  is_active: boolean
  admin_email: string
}

export interface HospitalWithTRS extends Hospital {
  trs_score: number
  trs_breakdown: TRSBreakdown
  distance_km: number
  eta_min: number
}

export interface TRSBreakdown {
  icu_score: number
  trauma_score: number
  blood_score: number
  distance_score: number
  traffic_score: number
  total: number
}

export interface Incident {
  id: string
  reporter_id: string
  lat: number
  lng: number
  address?: string
  accident_type?: string
  victim_count?: string
  description?: string
  photo_url?: string
  severity_tier?: SeverityTier
  severity_score?: number
  severity_confidence?: number
  ai_summary?: string
  ai_cv_finding?: string
  ai_nlp_finding?: string
  ai_location_finding?: string
  selected_hospital_id?: string
  trs_scores?: Record<string, number>
  ambulance_dispatched: boolean
  ambulance_eta_min?: number
  status: 'active' | 'en_route' | 'arrived' | 'resolved'
  hospital_alerted: boolean
  family_notified: boolean
  created_at: string
  updated_at: string
}

export interface SeverityAnalysis {
  severity: SeverityTier
  score: number
  confidence: number
  summary: string
  cv_finding: string
  nlp_finding: string
  location_finding: string
  recommendation: string
}

export interface Profile {
  id: string
  full_name: string
  phone: string
  blood_group: string
  allergies: string[]
  conditions: string[]
}

export interface EmergencyContact {
  id: string
  profile_id: string
  name: string
  phone: string
  relation: string
  priority: number
}

export interface DispatchPayload {
  incident_id: string
  hospital: HospitalWithTRS
  severity: SeverityTier
  eta_min: number
  victim_blood_group?: string
}
