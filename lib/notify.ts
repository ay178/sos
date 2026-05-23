import twilio from 'twilio'
import type { HospitalWithTRS, SeverityTier } from '@/types'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const FROM_SMS = process.env.TWILIO_PHONE_NUMBER!
const FROM_WA  = process.env.TWILIO_WHATSAPP_NUMBER!

export async function sendSMS(to: string, body: string) {
  try {
    const msg = await client.messages.create({ from: FROM_SMS, to, body })
    return { success: true, sid: msg.sid }
  } catch (e: unknown) {
    console.error('SMS failed:', e)
    return { success: false, error: String(e) }
  }
}

export async function sendWhatsApp(to: string, body: string) {
  const waTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  try {
    const msg = await client.messages.create({ from: FROM_WA, to: waTo, body })
    return { success: true, sid: msg.sid }
  } catch (e: unknown) {
    console.error('WhatsApp failed:', e)
    return { success: false, error: String(e) }
  }
}

// ── Message builders ──────────────────────────────────────────────────────

export function buildFamilyMessage(
  incidentId: string,
  hospital: HospitalWithTRS,
  severity: SeverityTier,
  appUrl: string
): string {
  const emoji = severity === 'Critical' ? '🚨' : severity === 'Serious' ? '⚠️' : 'ℹ️'
  return `${emoji} RoadSoS AI ALERT

An emergency SOS has been triggered by someone in your contacts.

Severity: ${severity}
Hospital: ${hospital.name}
Address: ${hospital.address}
ETA: ~${hospital.eta_min} min

Track live: ${appUrl}/tracking/${incidentId}

This is an automated alert from RoadSoS AI Emergency System.`
}

export function buildHospitalAlertMessage(
  hospital: HospitalWithTRS,
  severity: SeverityTier,
  etaMin: number,
  bloodGroup?: string,
  conditions?: string[]
): string {
  const prep = severity === 'Critical'
    ? 'IMMEDIATE: Activate full trauma team, reserve ICU bed, stage OR.'
    : severity === 'Serious'
    ? 'URGENT: Alert trauma team, prepare emergency bay.'
    : 'STANDARD: Prepare emergency bay.'

  return `🏥 RoadSoS AI — INCOMING PATIENT ALERT

Severity: ${severity.toUpperCase()}
ETA: ~${etaMin} minutes
${bloodGroup ? `Blood Group: ${bloodGroup}` : ''}
${conditions?.length ? `Conditions: ${conditions.join(', ')}` : ''}

${prep}

TRS Match Score: ${hospital.trs_score}/100
This alert was generated automatically by RoadSoS AI.`
}

export async function notifyFamily(
  contacts: Array<{ phone: string; name: string }>,
  incidentId: string,
  hospital: HospitalWithTRS,
  severity: SeverityTier
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const msg = buildFamilyMessage(incidentId, hospital, severity, appUrl)
  return Promise.all(
    contacts.map(async c => {
      const sms = await sendSMS(c.phone, msg)
      const wa  = await sendWhatsApp(c.phone, msg)
      return { contact: c.name, sms, wa }
    })
  )
}

export async function alertHospital(
  hospital: HospitalWithTRS,
  severity: SeverityTier,
  etaMin: number,
  bloodGroup?: string,
  conditions?: string[]
) {
  if (!hospital.phone) return { success: false, reason: 'no phone' }
  const msg = buildHospitalAlertMessage(hospital, severity, etaMin, bloodGroup, conditions)
  return sendSMS(hospital.phone, msg)
}
