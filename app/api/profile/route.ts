import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  blood_group: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  emergency_contacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    relation: z.string().optional(),
    priority: z.number().optional(),
  })).optional(),
})

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('*, emergency_contacts(*)').eq('id', user.id).single()
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.parse(await req.json())
  const db = createServiceClient()

  const { emergency_contacts, ...profileData } = body
  await db.from('profiles').upsert({ id: user.id, ...profileData, updated_at: new Date().toISOString() })

  if (emergency_contacts) {
    await db.from('emergency_contacts').delete().eq('profile_id', user.id)
    if (emergency_contacts.length > 0) {
      await db.from('emergency_contacts').insert(
        emergency_contacts.map((c, i) => ({ ...c, profile_id: user.id, priority: i + 1 }))
      )
    }
  }

  return NextResponse.json({ success: true })
}
