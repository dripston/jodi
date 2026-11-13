/** Day since delivery with a thin 42-day progress line; the first week is the riskiest. */
export function DayProgress({ day }: { day: number }) {
  const pct = Math.min(100, Math.round((day / 42) * 100));
  return (
    <div className="w-24">
      <p className="tabular text-body font-medium text-text">
        Day {day}
        {day <= 7 ? <span className="ml-1.5 text-caption font-normal text-text-subtle">first week</span> : null}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        <div className="h-full rounded-full bg-text-subtle" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
