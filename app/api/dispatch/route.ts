import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { notifyFamily, alertHospital } from '@/lib/notify'
import { z } from 'zod'

const schema = z.object({
  incident_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  eta_min: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    const { incident_id, hospital_id, eta_min } = schema.parse(await req.json())
    const supabase = createServiceClient()

    // Fetch incident + hospital + profile concurrently
    const [incidentRes, hospitalRes] = await Promise.all([
      supabase.from('incidents').select('*, profiles(blood_group, conditions, emergency_contacts(*))').eq('id', incident_id).single(),
      supabase.from('hospitals').select('*').eq('id', hospital_id).single(),
    ])

    if (incidentRes.error) throw incidentRes.error
    if (hospitalRes.error) throw hospitalRes.error

    const incident = incidentRes.data
    const hospital = hospitalRes.data

    // Mark incident dispatched
    await supabase.from('incidents').update({
      selected_hospital_id: hospital_id,
      ambulance_dispatched: true,
      ambulance_eta_min: eta_min,
      status: 'en_route',
      updated_at: new Date().toISOString(),
    }).eq('id', incident_id)

    const profile = incident.profiles as any
    const bloodGroup = profile?.blood_group
    const conditions = profile?.conditions || []
    const contacts: Array<{ name: string; phone: string }> =
      (profile?.emergency_contacts || []).map((c: any) => ({ name: c.name, phone: c.phone }))

    // Compute TRS for the selected hospital (reuse lib)
    const { computeTRS } = await import('@/lib/trs')
    const hospitalWithTRS = computeTRS(
      hospital,
      incident.lat,
      incident.lng,
      incident.severity_tier as any,
      bloodGroup
    )

    // Run notifications + hospital alert concurrently
    const [familyResults, hospitalAlert] = await Promise.all([
      contacts.length > 0
        ? notifyFamily(contacts, incident_id, hospitalWithTRS, incident.severity_tier as any)
        : Promise.resolve([]),
      alertHospital(hospitalWithTRS, incident.severity_tier as any, eta_min, bloodGroup, conditions),
    ])

    // Log hospital alert
    await supabase.from('hospital_alerts').insert({
      incident_id,
      hospital_id,
      severity_tier: incident.severity_tier,
      eta_min,
      preparation: { icu: true, or: true, blood: !!bloodGroup, team: true },
    })

    // Log family notifications
    if (familyResults.length > 0) {
      await supabase.from('notifications').insert(
        contacts.map((c, i) => ({
          incident_id,
          recipient: c.phone,
          channel: 'sms+whatsapp',
          status: (familyResults[i] as any)?.sms?.success ? 'sent' : 'failed',
          message: 'Family alert sent',
        }))
      )
    }

    // Update flags
    await supabase.from('incidents').update({
      hospital_alerted: hospitalAlert.success,
      family_notified: familyResults.length > 0,
    }).eq('id', incident_id)

    return NextResponse.json({
      success: true,
      hospital: hospitalWithTRS,
      eta_min,
      family_notified: familyResults.length,
      hospital_alerted: hospitalAlert.success,
    })
  } catch (e) {
    console.error('/api/dispatch error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
