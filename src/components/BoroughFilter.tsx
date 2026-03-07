import { BORO_ABBR, BOROUGHS } from "../searchStyles.js";

export default function BoroughFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap py-0.5">
      {BOROUGHS.map((b) => {
        const active = value.includes(b);
        return (
          <button
            key={b}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((x) => x !== b) : [...value, b])
            }
            title={b}
            className={`font-mono text-xs px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer
              ${
                active
                  ? "bg-yellow-400 border-yellow-400 text-zinc-950"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
              }`}
          >
            {BORO_ABBR[b]}
          </button>
        );
      })}
    </div>
  );
}
