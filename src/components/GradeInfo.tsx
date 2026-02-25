import { useCallback, useEffect, useRef, useState } from "react";

export default function GradeInfo({
  align = "center",
  direction = "down",
}: {
  align?: "left" | "center" | "right";
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Clamp popover within viewport after it renders
  const clampToViewport = useCallback((el: HTMLDivElement | null) => {
    popoverRef.current = el;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.left < 8) el.style.transform = `translateX(${8 - rect.left}px)`;
    else if (rect.right > window.innerWidth - 8)
      el.style.transform = `translateX(${window.innerWidth - 8 - rect.right}px)`;
  }, []);

  const offset = direction === "up" ? "bottom-6" : "top-6";
  const popoverPos =
    align === "left"
      ? `right-0 ${offset}`
      : align === "right"
        ? `left-0 ${offset}`
        : `left-1/2 -translate-x-1/2 ${offset}`;
  const caretPos =
    align === "left"
      ? "right-1"
      : align === "right"
        ? "left-1"
        : "left-1/2 -translate-x-1/2";
  const caretEdge =
    direction === "up"
      ? "-bottom-1.5 border-r border-b rotate-45"
      : "-top-1.5 border-l border-t rotate-45";

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Grading info"
        className="w-4 h-4 rounded-full border border-zinc-400 dark:border-zinc-500 text-zinc-400 dark:text-zinc-500 hover:border-yellow-500 hover:text-yellow-500 dark:hover:border-yellow-400 dark:hover:text-yellow-400 transition-colors flex items-center justify-center text-[10px] font-bold leading-none font-sans cursor-pointer"
      >
        i
      </button>

      {open && (
        <div
          ref={clampToViewport}
          className={`absolute ${popoverPos} z-50 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 text-left`}
        >
          <div
            className={`absolute ${caretPos} ${caretEdge} w-3 h-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700`}
          />
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
            Restaurants scoring 14+ can request a re-inspection before a grade
            is posted.{" "}
            <a
              href="https://www.nyc.gov/site/doh/business/food-operators/letter-grading-for-restaurants.page"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-600 dark:text-yellow-400 hover:underline"
            >
              NYC Health ↗
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
