export interface DeficiencyCategory {
  emoji: string;
  label: string;
}

// Categories from NYS AGM Sanitary Inspection Guidelines (FSI-890, Rev. 3/2025)
// https://agriculture.ny.gov/system/files/documents/2025/03/sanitary_inspection_guidelines_fsi-890.pdf
// 01–08 are Critical Deficiencies, 09–16 are General Deficiencies
const CATEGORIES: Record<string, DeficiencyCategory> = {
  "01": { emoji: "🥫", label: "Unapproved sources" },
  "02": { emoji: "🐀", label: "Adulterated food" },
  "03": { emoji: "🧤", label: "Worker contamination" },
  "04": { emoji: "⚠️", label: "Cross-contamination" },
  "05": { emoji: "🧪", label: "Critical processing" },
  "06": { emoji: "🌡️", label: "Cooling & refrigeration" },
  "07": { emoji: "🔥", label: "Cooking & reheating" },
  "08": { emoji: "♨️", label: "Hot-holding" },
  "09": { emoji: "🚰", label: "Sanitary facilities" },
  "10": { emoji: "🏚️", label: "Building maintenance" },
  "11": { emoji: "👔", label: "Food handler hygiene" },
  "12": { emoji: "📦", label: "Food storage" },
  "13": { emoji: "📋", label: "Processing & records" },
  "14": { emoji: "🪳", label: "Pest activity" },
  "15": { emoji: "🔧", label: "Equipment & utensils" },
  "16": { emoji: "🧹", label: "Other sanitation" },
};

const DEFAULT: DeficiencyCategory = { emoji: "📌", label: "Other" };

export function deficiencyCategory(code: string): DeficiencyCategory {
  const prefix = code.slice(0, 2);
  return CATEGORIES[prefix] ?? DEFAULT;
}
