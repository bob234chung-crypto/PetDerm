export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "justify-center"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-cream">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <ellipse cx="7" cy="8" rx="2.2" ry="2.8" />
          <ellipse cx="12" cy="5.5" rx="2.2" ry="2.8" />
          <ellipse cx="17" cy="8" rx="2.2" ry="2.8" />
          <ellipse cx="9.2" cy="11.5" rx="1.6" ry="2.1" />
          <path d="M8 14.5c0-1.8 1.7-3 4-3s4 1.2 4 3c0 2.4-2.1 4.5-4 5.2-1.9-.7-4-2.8-4-5.2Z" />
        </svg>
      </span>
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.22em] text-teal">PETDERM</p>
        {!compact ? <p className="text-[10px] tracking-[0.18em] text-mist">RESEARCH PHOTO</p> : null}
      </div>
    </div>
  );
}
