import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rankHospitals } from '@/lib/trs'
import { z } from 'zod'

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
  severity: z.enum(['Critical', 'Serious', 'Minor']),
  blood_group: z.string().optional(),
  max_radius_km: z.number().optional().default(30),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lat, lng, severity, blood_group, max_radius_km } = schema.parse(body)

    const supabase = createServiceClient()
    const { data: hospitals, error } = await supabase
      .from('hospitals').select('*').eq('is_active', true)

    if (error) throw error
    const ranked = rankHospitals(hospitals, lat, lng, severity, blood_group, max_radius_km)
    return NextResponse.json({ success: true, hospitals: ranked })
  } catch (e) {
    console.error('/api/trs error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
