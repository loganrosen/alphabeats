import { GRADE_STYLES } from "../gradeStyles.js";

const SIZE = {
  sm: {
    outer: "w-11 h-14",
    text: "text-3xl",
    sublabel: "absolute bottom-1.5",
    notYet: "w-11 h-14",
  },
  lg: {
    outer: "w-14 py-3",
    text: "text-4xl",
    sublabel: "mt-1",
    notYet: "w-14 py-3",
  },
} as const;

export default function GradeBadge({
  grade,
  display,
  sublabel = "GRADE",
  neverInspected,
  size = "sm",
}: {
  grade: string | null;
  display?: string;
  sublabel?: string;
  neverInspected: boolean;
  size?: "sm" | "lg";
}) {
  const s = SIZE[size];
  const displayText = display ?? grade ?? "?";
  const isStatus = displayText.length > 2;
  const outerClass = isStatus
    ? size === "lg"
      ? "w-24 py-3 px-2"
      : "w-20 h-14 px-2"
    : s.outer;
  const textClass = isStatus
    ? size === "lg"
      ? "font-mono font-bold text-base tracking-wide"
      : "font-mono font-bold text-sm tracking-wide"
    : `font-display ${s.text}`;
  const sublabelClass = isStatus ? "mt-1" : s.sublabel;

  if (neverInspected) {
    return (
      <div
        className={`${s.notYet} rounded shrink-0 flex flex-col items-center justify-center relative bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700`}
      >
        <span className="font-mono text-xs text-center leading-tight tracking-tight px-0.5">
          NOT YET
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${GRADE_STYLES[grade ?? ""] ?? "bg-zinc-400 dark:bg-zinc-700"} ${outerClass} rounded shrink-0 flex flex-col items-center justify-center relative text-white`}
    >
      <span className={`${textClass} leading-none`}>{displayText}</span>
      <span
        className={`font-mono text-[0.45rem] tracking-widest ${sublabelClass} opacity-75`}
      >
        {sublabel}
      </span>
    </div>
  );
}
