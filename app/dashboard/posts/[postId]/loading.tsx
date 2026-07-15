export default function EditPostLoading() {
  return (
    <div
      aria-label="Loading post editor"
      className="mx-auto w-full max-w-[1440px] animate-pulse px-4 pb-8 pt-3 sm:px-6 sm:pt-4 lg:px-8"
      role="status"
    >
      <header className="space-y-3">
        <div className="h-8 w-44 rounded-lg bg-[var(--skeleton)]" />
        <div className="h-4 w-full max-w-md rounded bg-[var(--skeleton)]" />
      </header>

      <div className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="glass-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="h-6 w-36 rounded bg-[var(--skeleton)]" />
              <div className="h-4 w-64 max-w-full rounded bg-[var(--skeleton)]" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 rounded-full bg-[var(--skeleton)]" />
              <div className="h-10 w-20 rounded-full bg-[var(--skeleton)]" />
              <div className="h-10 w-10 rounded-full bg-[var(--skeleton)]" />
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <div>
              <div className="mb-2 h-4 w-20 rounded bg-[var(--skeleton)]" />
              <div className="h-48 rounded-2xl bg-[var(--skeleton)] sm:h-56" />
            </div>
          </div>
        </section>

        <aside className="glass-panel hidden h-fit p-5 2xl:block">
          <div className="h-6 w-28 rounded bg-[var(--skeleton)]" />
          <div className="mt-3 h-4 w-64 max-w-full rounded bg-[var(--skeleton)]" />
          <div className="mt-5 h-28 rounded-2xl bg-[var(--skeleton)]" />
          <div className="mt-4 h-24 rounded-2xl bg-[var(--skeleton)]" />
        </aside>
      </div>

      <span className="sr-only">Loading post editor…</span>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div>
      <div className="mb-2 h-4 w-16 rounded bg-[var(--skeleton)]" />
      <div className="h-11 rounded-full bg-[var(--skeleton)]" />
    </div>
  );
}
