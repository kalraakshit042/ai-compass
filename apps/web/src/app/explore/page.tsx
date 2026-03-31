import { createServerClient } from '@/lib/supabase.server'
import { QueryGrid } from '@/components/query-grid'
import { Header } from '@/components/header'

export default async function ExplorePage() {
  let queries: { id: string; query_text: string }[] = []
  let count: number | null = null

  try {
    const db = createServerClient()
    const [listResult, countResult] = await Promise.all([
      db.from('queries')
        .select('id, query_text')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('queries').select('id', { count: 'exact', head: true }).eq('approved', true)
    ])
    queries = listResult.data ?? []
    count = countResult.count
  } catch {
    // Supabase unreachable — render graceful fallback, not 500
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <h1 className="text-2xl font-semibold mb-2">What people are building with AI</h1>
        <p className="text-muted text-sm mb-8">
          {count !== null ? `${count.toLocaleString()} queries answered` : 'Queries answered'}
        </p>
        {queries.length === 0
          ? <p className="text-muted text-sm">No queries yet.</p>
          : <QueryGrid queries={queries} />
        }
      </main>
    </div>
  )
}
