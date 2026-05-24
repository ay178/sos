import { NextRequest, NextResponse } from 'next/server'
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
  return NextResponse.json({ profile: null })
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const db = createServiceClient()
    const { emergency_contacts, ...profileData } = body

    const { data, error } = await db.from('profiles').upsert({
      ...profileData, updated_at: new Date().toISOString()
    }).select().single()

    if (error) throw error
    return NextResponse.json({ success: true, profile: data })
  } catch (e) {
    console.error('/api/profile error:', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
