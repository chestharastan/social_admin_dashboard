// components/ui/kpi-card.tsx
type KpiCardProps = {
  label: string;
  value: number | string;
  helper: string;
};

export function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <div className="glass-panel p-4">
      <dt className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
        {label}
        <span className="group relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[10px] font-semibold text-[#99958d] hover:border-[#cbc7bf] hover:text-[#59564f]">
          ?
          <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-max max-w-[180px] -translate-x-1/2 rounded-lg bg-[#23221f] px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {helper}
          </span>
        </span>
      </dt>
      <dd className="mt-2 type-display text-3xl font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}