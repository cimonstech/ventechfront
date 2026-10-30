export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function LineSkeleton({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-4 w-full ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AccountListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="rounded-xl bg-white p-4 sm:p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 sm:p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
