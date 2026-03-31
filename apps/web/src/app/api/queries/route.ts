import { createServerClient } from '@/lib/supabase.server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('queries')
      .select('id, query_text')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(24)

    if (error) throw error

    const shuffled = (data ?? [])
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item)
      .slice(0, 6)

    return NextResponse.json(shuffled, {
      headers: { 'Cache-Control': 'public, max-age=60' }
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
