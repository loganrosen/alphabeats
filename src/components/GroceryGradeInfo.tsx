import InfoPopover from "./InfoPopover.js";

/**
 * Grade explanation tooltip for NY State food store inspections.
 * Parallels GradeInfo.tsx (restaurant version).
 *
 * Source: NYS Dept of Agriculture & Markets, Sanitary Inspection Guidelines (FSI-890)
 * https://agriculture.ny.gov/system/files/documents/2025/03/sanitary_inspection_guidelines_fsi-890.pdf
 */
export default function GroceryGradeInfo({
  align = "center",
  direction = "down",
}: {
  align?: "left" | "center" | "right";
  direction?: "up" | "down";
}) {
  return (
    <InfoPopover align={align} direction={direction}>
      <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mb-2">
        NY State Food Store Grades
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-3 leading-relaxed">
        NYS Agriculture & Markets inspectors check for{" "}
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          deficiencies
        </span>{" "}
        in food safety practices — pest control, food handling, equipment
        condition, and more.
      </p>
      <div className="flex flex-col gap-1.5 mb-3">
        {[
          { grade: "A", color: "bg-green-700", desc: "Compliance" },
          { grade: "B", color: "bg-amber-600", desc: "Needs improvement" },
          { grade: "C", color: "bg-red-600", desc: "Significant deficiencies" },
        ].map(({ grade, color, desc }) => (
          <div key={grade} className="flex items-center gap-2">
            <span
              className={`${color} text-white font-display text-sm w-6 h-6 rounded flex items-center justify-center shrink-0`}
            >
              {grade}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {desc}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
        Grades are based on{" "}
        <a
          href="https://agriculture.ny.gov/system/files/documents/2025/03/sanitary_inspection_guidelines_fsi-890.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-600 dark:text-yellow-400 hover:underline"
        >
          FSI-890 guidelines ↗
        </a>
      </p>
    </InfoPopover>
  );
}
