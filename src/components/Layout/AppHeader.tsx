/** Neutral brand mark (red square + slash) — intentionally non-identifying. */
function Mark() {
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary font-display text-[18px] font-semibold leading-none text-white"
    >
      /
    </span>
  );
}

export function AppHeader() {
  return (
    <header className="no-print border-b border-hairline">
      <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <div className="font-display text-[18px] leading-none text-ink">CTC Offer Calculator</div>
            <div className="text-[11px] text-muted">M-5 to M-11 · runs entirely in your browser</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-info">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-pill bg-info" />
          All calculations run in your browser. No data is saved or sent anywhere.
        </div>
      </div>
    </header>
  );
}
