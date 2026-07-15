export default function DashboardLoading() {
  return (
    <div
      aria-label="Loading dashboard"
      className="mx-auto w-full max-w-[1440px] animate-pulse space-y-8 px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8"
      role="status"
    >
      <div className="space-y-3">
        <div className="h-8 w-44 rounded-md bg-[var(--skeleton)]" />
        <div className="h-4 w-full max-w-xl rounded bg-[var(--skeleton)]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="glass-panel h-36 p-5"
            key={index}
          >
            <div className="h-4 w-24 rounded bg-[var(--skeleton)]" />
            <div className="mt-4 h-9 w-12 rounded bg-[var(--skeleton)]" />
            <div className="mt-3 h-4 w-36 rounded bg-[var(--skeleton)]" />
          </div>
        ))}
      </div>

      <div className="glass-panel p-5">
        <div className="h-5 w-32 rounded bg-[var(--skeleton)]" />
        <div className="mt-3 h-4 w-44 rounded bg-[var(--skeleton)]" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="h-10 w-full rounded-md bg-[var(--skeleton)] sm:w-48" />
          <div className="h-10 w-full rounded-md bg-[var(--skeleton)] sm:w-48" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 w-32 rounded bg-[var(--skeleton)]" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="glass-panel overflow-hidden"
              key={index}
            >
              <div className="aspect-[16/10] bg-[var(--skeleton)]" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-28 rounded bg-[var(--skeleton)]" />
                <div className="h-5 w-3/4 rounded bg-[var(--skeleton)]" />
                <div className="h-4 w-full rounded bg-[var(--skeleton)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
