export default function PostDetailsLoading() {
  return (
    <div
      aria-label="Loading post editor"
      className="mx-auto w-full max-w-[1440px] animate-pulse space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="w-full max-w-xl space-y-3">
          <div className="h-8 w-2/3 rounded-md bg-[var(--line)]" />
          <div className="h-4 w-full max-w-md rounded bg-[var(--line)]" />
        </div>
        <div className="h-10 w-36 rounded-md bg-[var(--line)]" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="h-[520px] rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-sm" />
        <div className="h-[420px] rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-sm" />
      </div>
      <span className="sr-only">Loading post editor…</span>
    </div>
  );
}
