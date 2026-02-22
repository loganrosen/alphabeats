export interface ViolationCategory { emoji: string; label: string; }

// Primary lookup: violation code → category.
// Codes occasionally changed meaning over time; we map by the predominant current usage.
const CODE_MAP: Record<string, ViolationCategory> = {
  // Temperature / food safety
  '02A': { emoji: '🌡️', label: 'Temperature' },
  '02B': { emoji: '🌡️', label: 'Temperature' },
  '02C': { emoji: '🌡️', label: 'Temperature' },
  '02D': { emoji: '🌡️', label: 'Temperature' },
  '02F': { emoji: '🌡️', label: 'Temperature' },
  '02G': { emoji: '🌡️', label: 'Temperature' },
  '02H': { emoji: '🌡️', label: 'Temperature' },
  '02I': { emoji: '🌡️', label: 'Temperature' },
  '05E': { emoji: '🌡️', label: 'Temperature' },
  '05F': { emoji: '🌡️', label: 'Temperature' },
  '10E': { emoji: '🌡️', label: 'Temperature' },

  // Unapproved / contaminated food source
  '03A': { emoji: '⚠️', label: 'Contamination' },
  '03B': { emoji: '⚠️', label: 'Contamination' },
  '03C': { emoji: '⚠️', label: 'Contamination' },
  '03D': { emoji: '⚠️', label: 'Contamination' },
  '03F': { emoji: '⚠️', label: 'Contamination' },
  '03G': { emoji: '⚠️', label: 'Contamination' },
  '03I': { emoji: '📋', label: 'Permit / posting' },
  '04H': { emoji: '⚠️', label: 'Contamination' },
  '04I': { emoji: '⚠️', label: 'Contamination' },
  '04P': { emoji: '⚠️', label: 'Contamination' },
  '06C': { emoji: '⚠️', label: 'Contamination' },
  '05B': { emoji: '⚠️', label: 'Contamination' },

  // Hand hygiene / personal cleanliness
  '04C': { emoji: '🧼', label: 'Hand hygiene' },
  '04D': { emoji: '🧼', label: 'Hand hygiene' },
  '05D': { emoji: '🧼', label: 'Hand hygiene' },
  '06A': { emoji: '🧼', label: 'Hand hygiene' },
  '09E': { emoji: '🧼', label: 'Hand hygiene' },
  '10J': { emoji: '🧼', label: 'Hand hygiene' },
  '10M': { emoji: '🧼', label: 'Hand hygiene' },

  // Toxic chemicals / pesticides
  '04E': { emoji: '⚠️', label: 'Contamination' },
  '08C': { emoji: '⚠️', label: 'Contamination' },

  // Rodents
  '04K': { emoji: '🐀', label: 'Rodents' },
  '04L': { emoji: '🐀', label: 'Rodents' },
  '08A': { emoji: '🐀', label: 'Vermin / harborage' },

  // Cockroaches
  '04M': { emoji: '🪳', label: 'Cockroaches' },
  '04N': { emoji: '🪳', label: 'Cockroaches / flies' },

  // Other live animals
  '04O': { emoji: '🐾', label: 'Live animals' },

  // Plumbing / water / sewage
  '03E': { emoji: '🚰', label: 'Plumbing' },
  '05A': { emoji: '🚰', label: 'Plumbing' },
  '10A': { emoji: '🚰', label: 'Plumbing' },
  '10B': { emoji: '🚰', label: 'Plumbing' },

  // Sanitation / food contact surfaces
  '05C': { emoji: '🧹', label: 'Sanitation' },
  '05H': { emoji: '🧹', label: 'Sanitation' },
  '06D': { emoji: '🧹', label: 'Sanitation' },
  '06E': { emoji: '🧹', label: 'Sanitation' },
  '06F': { emoji: '🧹', label: 'Sanitation' },
  '09C': { emoji: '🧹', label: 'Sanitation' },
  '09D': { emoji: '🧹', label: 'Sanitation' },
  '10F': { emoji: '🧹', label: 'Sanitation' },
  '10G': { emoji: '🧹', label: 'Sanitation' },
  '10H': { emoji: '🧹', label: 'Sanitation' },
  '10I': { emoji: '🧹', label: 'Sanitation' },
  '10K': { emoji: '🧹', label: 'Sanitation' },

  // Waste / garbage
  '08B': { emoji: '🗑️', label: 'Waste / garbage' },

  // Smoking / tobacco
  '06B': { emoji: '🚬', label: 'Smoking' },

  // Permit / posting / compliance
  '04A': { emoji: '📋', label: 'Permit / posting' },
  '04B': { emoji: '📋', label: 'Permit / posting' },
  '04F': { emoji: '📋', label: 'Permit / posting' },
  '04J': { emoji: '📋', label: 'Permit / posting' },
  '05I': { emoji: '📋', label: 'Permit / posting' },
  '06G': { emoji: '📋', label: 'Permit / posting' },
  '06H': { emoji: '📋', label: 'Permit / posting' },
  '06I': { emoji: '📋', label: 'Permit / posting' },
  '07A': { emoji: '📋', label: 'Permit / posting' },
  '09A': { emoji: '📋', label: 'Permit / posting' },
  '09B': { emoji: '📋', label: 'Permit / posting' },
  '10C': { emoji: '📋', label: 'Permit / posting' },
  '10D': { emoji: '📋', label: 'Permit / posting' },
};

// Prefix map for smoking codes (15-xx, 15A1, 15E2, etc.)
const SMOKING_PREFIXES = ['15-', '15A', '15E', '15F', '15I', '15K', '15L', '15S'];

// Nutrition labeling codes (16-xx, 16A, 16B, 16C)
const NUTRITION_PREFIXES = ['16-', '16A', '16B', '16C'];

const DEFAULT: ViolationCategory = { emoji: '📌', label: 'Other violation' };

export function violationCategory(code: string, _desc?: string): ViolationCategory {
  if (CODE_MAP[code]) return CODE_MAP[code];
  if (SMOKING_PREFIXES.some(p => code.startsWith(p))) return { emoji: '🚬', label: 'Smoking' };
  if (NUTRITION_PREFIXES.some(p => code.startsWith(p))) return { emoji: '📋', label: 'Nutrition labeling' };
  return DEFAULT;
}
