export default function ViewPostLoading() {
  return (
    <div
      aria-label="Loading post"
      className="mx-auto w-full max-w-[1440px] animate-pulse px-4 pb-8 pt-3 sm:px-6 sm:pt-4 lg:px-8"
      role="status"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full max-w-xl space-y-3">
          <div className="h-4 w-28 rounded bg-[var(--skeleton)]" />
          <div className="h-8 w-2/3 rounded-lg bg-[var(--skeleton)]" />
        </div>
        <div className="h-10 w-24 rounded-full bg-[var(--skeleton)]" />
      </header>

      <article className="glass-panel mt-5 overflow-hidden">
        <div className="h-[clamp(220px,42vh,420px)] w-full bg-[var(--skeleton)]" />
        <div className="p-5 sm:p-7">
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-[var(--skeleton)]" />
            <div className="h-6 w-24 rounded-full bg-[var(--skeleton)]" />
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-4 w-full rounded bg-[var(--skeleton)]" />
            <div className="h-4 w-11/12 rounded bg-[var(--skeleton)]" />
            <div className="h-4 w-4/5 rounded bg-[var(--skeleton)]" />
          </div>
        </div>
      </article>

      <span className="sr-only">Loading post…</span>
    </div>
  );
}
