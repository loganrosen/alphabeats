import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reusable "ⓘ" popover shell with click-outside dismissal and viewport clamping.
 * Pass domain-specific content as children.
 */
export default function InfoPopover({
  align = "center",
  direction = "down",
  children,
}: {
  align?: "left" | "center" | "right";
  direction?: "up" | "down";
  children: React.ReactNode;
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
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
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
          {children}
        </div>
      )}
    </div>
  );
}
