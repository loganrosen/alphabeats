export interface DeficiencyCategory {
  emoji: string;
  label: string;
}

const CATEGORIES: Record<string, DeficiencyCategory> = {
  "01": { emoji: "🥫", label: "Food sources" },
  "02": { emoji: "🛡️", label: "Food protection" },
  "03": { emoji: "🏷️", label: "Labeling" },
  "04": { emoji: "🌡️", label: "Temperature" },
  "05": { emoji: "🚰", label: "Water supply" },
  "06": { emoji: "🪠", label: "Plumbing" },
  "07": { emoji: "🚻", label: "Facilities" },
  "08": { emoji: "☠️", label: "Toxic materials" },
  "09": { emoji: "🧹", label: "Cleanliness" },
  "10": { emoji: "🐀", label: "Pest control" },
  "11": { emoji: "🧤", label: "Personnel hygiene" },
  "12": { emoji: "🔧", label: "Equipment" },
  "13": { emoji: "🏗️", label: "Facility construction" },
  "14": { emoji: "💡", label: "Lighting & ventilation" },
  "15": { emoji: "📋", label: "Compliance" },
  "16": { emoji: "📄", label: "Licensing" },
};

const DEFAULT: DeficiencyCategory = { emoji: "📌", label: "Other" };

export function deficiencyCategory(code: string): DeficiencyCategory {
  const prefix = code.slice(0, 2);
  return CATEGORIES[prefix] ?? DEFAULT;
}
