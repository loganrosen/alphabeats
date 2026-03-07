import InfoPopover from "./InfoPopover.js";

export default function GradeInfo({
  align = "center",
  direction = "down",
}: {
  align?: "left" | "center" | "right";
  direction?: "up" | "down";
}) {
  return (
    <InfoPopover align={align} direction={direction}>
      <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-2">
        NYC Restaurant Grades
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-3 leading-relaxed">
        Inspectors assign{" "}
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          violation points
        </span>{" "}
        based on what they find. Lower is better.{" "}
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          Critical violations
        </span>{" "}
        carry more points.
      </p>
      <div className="flex flex-col gap-1.5 mb-3">
        {[
          { grade: "A", color: "bg-green-700", pts: "0 – 13 pts" },
          { grade: "B", color: "bg-amber-600", pts: "14 – 27 pts" },
          { grade: "C", color: "bg-red-600", pts: "28+ pts" },
        ].map(({ grade, color, pts }) => (
          <div key={grade} className="flex items-center gap-2">
            <span
              className={`${color} text-white font-display text-sm w-6 h-6 rounded flex items-center justify-center shrink-0`}
            >
              {grade}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {pts}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="bg-zinc-500 text-white font-display text-sm w-6 h-6 rounded flex items-center justify-center shrink-0">
            P
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-300">
            Grade pending re-inspection
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-zinc-400 text-white font-display text-sm w-6 h-6 rounded flex items-center justify-center shrink-0">
            N
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-300">
            Not yet graded
          </span>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
        Restaurants scoring 14+ can request a re-inspection before a grade is
        posted.{" "}
        <a
          href="https://portal.311.nyc.gov/article/?kanumber=KA-01057"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-600 dark:text-yellow-400 hover:underline"
        >
          NYC Health ↗
        </a>
      </p>
    </InfoPopover>
  );
}
