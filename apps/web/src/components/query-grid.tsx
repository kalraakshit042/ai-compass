'use client'

interface Query { id: string; query_text: string }

interface QueryGridProps {
  queries: Query[]
  onSelect?: (q: string) => void
}

export function QueryGrid({ queries, onSelect }: QueryGridProps) {
  if (queries.length === 0) return null

  const cardBase = "text-left p-3 rounded-lg bg-surface border border-border min-h-[72px] flex items-start transition-colors"

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      {queries.map((q) => {
        const text = (
          <span className="text-sm text-muted line-clamp-3 leading-snug">
            {q.query_text}
          </span>
        )

        if (!onSelect) {
          return (
            <div key={q.id} className={cardBase}>
              {text}
            </div>
          )
        }

        return (
          <button
            key={q.id}
            onClick={() => onSelect(q.query_text)}
            aria-label={`Use query: ${q.query_text.slice(0, 60)}`}
            className={`${cardBase} hover:bg-surface/80 hover:border-border/80 group`}
          >
            <span className="text-sm text-muted group-hover:text-foreground line-clamp-3 leading-snug transition-colors">
              {q.query_text}
            </span>
          </button>
        )
      })}
    </div>
  )
}
