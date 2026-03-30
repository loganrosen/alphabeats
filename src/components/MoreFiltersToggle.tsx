export default function MoreFiltersToggle({
  open,
  onToggle,
  hasFilters,
}: {
  open: boolean;
  onToggle: () => void;
  hasFilters: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="font-mono text-xs tracking-widest text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5"
    >
      <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
        ▶
      </span>
      MORE FILTERS
      {hasFilters && !open && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
      )}
    </button>
  );
}
