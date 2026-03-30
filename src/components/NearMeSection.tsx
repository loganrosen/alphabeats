const CROSSHAIR_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
  </svg>
);

const RADIUS_OPTIONS = [0.1, 0.25, 0.5, 1] as const;

export default function NearMeSection({
  active,
  status,
  radius,
  onLocate,
  onClear,
  onRadiusChange,
  loading,
}: {
  active: boolean;
  status: "idle" | "loading" | "success" | "error";
  radius: number;
  onLocate: () => void;
  onClear: () => void;
  onRadiusChange: (r: number) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-sm tracking-widest px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 bg-yellow-400 text-zinc-950 hover:bg-yellow-500 transition-colors whitespace-nowrap"
          title="Remove location filter"
        >
          {CROSSHAIR_ICON}
          NEAR ME ×
        </button>
      ) : (
        <button
          type="button"
          onClick={onLocate}
          disabled={loading || status === "loading"}
          className="font-mono text-sm tracking-widest text-zinc-600 border border-zinc-300 px-4 py-2 rounded-md cursor-pointer hover:text-zinc-900 hover:border-zinc-500 transition-colors whitespace-nowrap dark:text-zinc-300 dark:border-zinc-600 dark:hover:text-white dark:hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          title="Find results near your current location"
        >
          {CROSSHAIR_ICON}
          {status === "loading" ? "…" : "NEAR ME"}
        </button>
      )}
      {active && (
        <div className="flex border border-zinc-300 dark:border-zinc-600 rounded-md overflow-hidden">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              className={`font-mono text-xs px-2 py-2 cursor-pointer transition-colors whitespace-nowrap ${radius === r ? "bg-yellow-400 text-zinc-950" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            >
              {r < 1 ? `${r}` : `${r}`}mi
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
