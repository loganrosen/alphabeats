import { GRADE_STYLES } from "../gradeStyles.js";

export default function GradeBadge({
  grade,
  display,
  sublabel = "GRADE",
  neverInspected,
}: {
  grade: string | null;
  display?: string;
  sublabel?: string;
  neverInspected: boolean;
}) {
  if (neverInspected) {
    return (
      <div className="w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
        <span className="font-mono text-xs text-center leading-tight tracking-tight px-0.5">
          NOT YET
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${GRADE_STYLES[grade ?? ""] ?? "bg-zinc-400 dark:bg-zinc-700"} w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative text-white`}
    >
      <span className="font-display text-3xl leading-none">
        {display ?? grade ?? "?"}
      </span>
      <span className="font-mono text-[0.45rem] tracking-widest absolute bottom-1.5 opacity-75">
        {sublabel}
      </span>
    </div>
  );
}
