export default function Loading() {
  return (
    <div className="page-shell py-8 sm:py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <div className="space-y-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-10 w-2/3 max-w-md" />
        <div className="skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4">
            <div className="skeleton h-9 w-9 !rounded-xl" />
            <div className="skeleton mt-4 h-7 w-12" />
            <div className="skeleton mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_0.95fr]">
        <div className="card p-5">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton mt-4 h-10 w-full !rounded-full" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-line p-4">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-2 h-5 w-3/4" />
                <div className="skeleton mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="skeleton h-6 w-36" />
          <div className="skeleton mt-4 h-24 w-full" />
          <div className="skeleton mt-4 h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
