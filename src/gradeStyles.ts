export const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-700",
  B: "bg-amber-600",
  C: "bg-red-600",
};

export const GRADE_TEXT: Record<string, string> = {
  A: "text-green-700 dark:text-green-400",
  B: "text-amber-600 dark:text-amber-400",
  C: "text-red-600 dark:text-red-400",
};

export const GRADE_LABEL: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
  N: "N",
  Z: "P",
  P: "P",
};

export const GRADE_COLOR: Record<string, string> = {
  A: "#15803d",
  B: "#d97706",
  C: "#dc2626",
};

export const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

/** Map a numeric violation score to the letter grade it would receive. */
export function gradeForScore(score: number): "A" | "B" | "C" {
  if (score <= 13) return "A";
  if (score <= 27) return "B";
  return "C";
}
