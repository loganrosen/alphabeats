export const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

export const BORO_ABBR: Record<string, string> = {
  Manhattan: "MN",
  Brooklyn: "BK",
  Queens: "QN",
  Bronx: "BX",
  "Staten Island": "SI",
};

export const inputCls =
  "w-full bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 rounded-md px-3 py-2.5 text-base focus:outline-none focus:border-yellow-500 transition-colors dark:bg-zinc-950 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-yellow-400";

export const labelCls =
  "font-mono text-xs text-zinc-500 tracking-widest uppercase dark:text-zinc-300";
