export default function GradeFilter({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: [code: string, label: string][];
}) {
  return (
    <div className="flex gap-1.5 flex-wrap py-0.5">
      {options.map(([code, label]) => {
        const active = value.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() =>
              onChange(
                active ? value.filter((g) => g !== code) : [...value, code],
              )
            }
            className={`font-mono text-xs px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer
              ${
                active
                  ? "bg-yellow-400 border-yellow-400 text-zinc-950 dark:bg-yellow-400 dark:border-yellow-400"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
              }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
