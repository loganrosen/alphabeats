export interface ViolationCategory {
  emoji: string;
  label: string;
}

// Each entry: [emoji, label, ...codes]
// Codes occasionally changed meaning over time; we map by the predominant current usage.
const CATEGORIES: [string, string, ...string[]][] = [
  [
    "🌡️",
    "Temperature",
    "02A",
    "02B",
    "02C",
    "02D",
    "02F",
    "02G",
    "02H",
    "02I",
    "05E",
    "05F",
    "10E",
  ],
  [
    "⚠️",
    "Contamination",
    "03A",
    "03B",
    "03C",
    "03D",
    "03F",
    "03G",
    "04E",
    "04H",
    "04I",
    "04P",
    "05B",
    "06C",
    "08C",
  ],
  ["⚠️", "Pest harborage conditions", "08A"],
  ["🧼", "Hand hygiene", "04C", "04D", "05D", "06A", "09E", "10J", "10M"],
  ["🐀", "Rodents", "04K", "04L"],
  ["🪳", "Cockroaches", "04M"],
  ["🪳", "Cockroaches / flies", "04N"],
  ["🐾", "Live animals", "04O"],
  ["🚰", "Plumbing", "03E", "05A", "10A", "10B"],
  [
    "🧹",
    "Sanitation",
    "05C",
    "05H",
    "06D",
    "06E",
    "06F",
    "09C",
    "09D",
    "10F",
    "10G",
    "10H",
    "10I",
    "10K",
  ],
  ["🗑️", "Waste / garbage", "08B"],
  ["🚬", "Smoking", "06B"],
  [
    "📋",
    "Permit / posting",
    "03I",
    "04A",
    "04B",
    "04F",
    "04J",
    "05I",
    "06G",
    "06H",
    "06I",
    "07A",
    "09A",
    "09B",
    "10C",
    "10D",
  ],
];

const CODE_MAP: Record<string, ViolationCategory> = {};
for (const [emoji, label, ...codes] of CATEGORIES) {
  for (const code of codes) CODE_MAP[code] = { emoji, label };
}

// Prefix-matched categories (15-xx smoking, 16-xx nutrition labeling)
const PREFIX_CATEGORIES: [string[], ViolationCategory][] = [
  [
    ["15-", "15A", "15E", "15F", "15I", "15K", "15L", "15S"],
    { emoji: "🚬", label: "Smoking" },
  ],
  [["16-", "16A", "16B", "16C"], { emoji: "📋", label: "Nutrition labeling" }],
];

const DEFAULT: ViolationCategory = { emoji: "📌", label: "Other violation" };

export function violationCategory(
  code: string,
  _desc?: string,
): ViolationCategory {
  if (CODE_MAP[code]) return CODE_MAP[code];
  for (const [prefixes, cat] of PREFIX_CATEGORIES) {
    if (prefixes.some((p) => code.startsWith(p))) return cat;
  }
  return DEFAULT;
}
