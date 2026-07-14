export default function QrCodeLoading() {
  return (
    <div
      aria-label="Loading QR codes"
      className="mx-auto w-full max-w-[1440px] animate-pulse space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
    >
      <div className="space-y-3">
        <div className="h-8 w-40 rounded-md bg-[var(--line)]" />
        <div className="h-4 w-full max-w-xl rounded bg-[var(--line)]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-80 rounded-md border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="h-5 w-40 rounded bg-[var(--line)]" />
          <div className="mt-3 h-4 w-72 max-w-full rounded bg-[var(--line)]" />
          <div className="mt-6 h-11 w-full rounded-md bg-[var(--line)]" />
          <div className="mt-4 h-11 w-full rounded-md bg-[var(--line)]" />
          <div className="mt-4 h-11 w-44 rounded-md bg-[var(--line)]" />
        </div>
        <div className="aspect-square rounded-md border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="h-5 w-28 rounded bg-[var(--line)]" />
          <div className="mt-4 h-[calc(100%-2.25rem)] rounded-md bg-[var(--line)]" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 w-44 rounded bg-[var(--line)]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="h-20 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm"
              key={index}
            >
              <div className="h-4 w-32 rounded bg-[var(--line)]" />
              <div className="mt-2 h-3 w-full rounded bg-[var(--line)]" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading QR codes…</span>
    </div>
  );
}
