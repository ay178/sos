import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { lat, lng, accident_type, victim_count, description } = body

    if (!lat || !lng) {
      return NextResponse.json({ success: false, error: 'Location required' }, { status: 400 })
    }

    const db = createServiceClient()
    const { data, error } = await db.from('incidents').insert({
      reporter_id: user?.id ?? null,
      lat,
      lng,
      accident_type,
      victim_count,
      description,
      status: 'active',
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, incident: data })
  } catch (e) {
    console.error('/api/sos error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
