import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}
