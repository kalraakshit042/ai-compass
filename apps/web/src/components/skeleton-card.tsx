export function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="bg-surface border border-border rounded-lg p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2">
          <div className="skeleton h-3 w-32 bg-border rounded" />
          <div className="skeleton h-5 w-48 bg-border rounded" />
        </div>
        <div className="skeleton h-7 w-24 bg-border rounded-md" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="skeleton h-3 w-full bg-border rounded" />
        <div className="skeleton h-3 w-5/6 bg-border rounded" />
        <div className="skeleton h-3 w-3/4 bg-border rounded" />
      </div>
      <div className="skeleton h-3 w-2/3 bg-border rounded" />
    </div>
  );
}
