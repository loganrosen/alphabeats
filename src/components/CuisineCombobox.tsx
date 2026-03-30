import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useRef, useState } from "react";

interface Props {
  value: string; // comma-separated, e.g. "Indian,Pakistani"
  onChange: (v: string) => void;
  cuisines: string[];
  className?: string;
}

export default function CuisineCombobox({
  value,
  onChange,
  cuisines,
  className,
}: Props) {
  const selected = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.length === 0
      ? cuisines
      : cuisines.filter((c) => c.toLowerCase().includes(query.toLowerCase()));

  const add = (cuisine: string | null) => {
    if (!cuisine) return;
    if (!selected.includes(cuisine)) {
      onChange([...selected, cuisine].join(","));
    }
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (cuisine: string) => {
    onChange(selected.filter((s) => s !== cuisine).join(","));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-1.5 items-center min-h-[2.75rem] px-2 py-1.5 bg-white border border-zinc-300 rounded-md focus-within:border-yellow-500 transition-colors dark:bg-zinc-950 dark:border-zinc-600 dark:focus-within:border-yellow-400 cursor-text ${className ?? ""}`}
    >
      {selected.map((c) => (
        <span
          key={c}
          className="flex items-center gap-1 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300 font-mono text-xs px-2 py-0.5 rounded-full shrink-0"
        >
          {c}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove(c);
            }}
            className="opacity-60 hover:opacity-100 leading-none cursor-pointer"
          >
            ×
          </button>
        </span>
      ))}

      <Combobox onChange={add}>
        <ComboboxInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? "e.g. Italian, Chinese…" : ""}
          className="flex-1 min-w-[120px] bg-transparent text-base text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        {filtered.length > 0 && (
          <ComboboxOptions
            anchor="bottom start"
            className="z-50 w-64 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg mt-1 py-1 font-sans text-sm"
          >
            {filtered.map((c) => (
              <ComboboxOption
                key={c}
                value={c}
                disabled={selected.includes(c)}
                className={({ focus, disabled }) =>
                  `px-3 py-1.5 cursor-pointer flex items-center justify-between
                  ${disabled ? "opacity-40 cursor-default" : ""}
                  ${focus && !disabled ? "bg-yellow-50 dark:bg-yellow-900/20 text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`
                }
              >
                {({ selected: sel }) => (
                  <>
                    <span>{c}</span>
                    {sel && <span className="text-yellow-500 text-xs">✓</span>}
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        )}
      </Combobox>
    </div>
  );
}
