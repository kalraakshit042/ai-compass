import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY')
}

export function createServerClient() {
  if (!url || !key) throw new Error('Supabase server env vars not configured')
  return createClient(url, key)
}
