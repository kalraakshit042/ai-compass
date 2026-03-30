import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Singleton — do not recreate on every render
export const supabaseBrowser = createClient(url, anon)
