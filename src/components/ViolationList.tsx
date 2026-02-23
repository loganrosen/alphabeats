import type { Violation } from "../api.js";
import { violationCategory } from "../violationCategory.js";

export default function ViolationList({
	violations,
}: {
	violations: Violation[];
}) {
	const sorted = [...violations].sort(
		(a, b) => Number(b.critical) - Number(a.critical),
	);
	return (
		<div className="flex flex-col gap-2 mt-1">
			{sorted.map((v, i) => {
				const { emoji, label } = violationCategory(v.code, v.desc);
				return (
					<div
						key={i}
						className={`text-sm pl-3 border-l-2 leading-relaxed ${v.critical ? "border-red-500 text-zinc-800 dark:text-zinc-100" : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"}`}
					>
						<div className="font-mono text-xs text-yellow-600 mb-0.5 dark:text-yellow-400">
							<span title={label}>{emoji}</span> {v.code}
							{v.critical ? " · CRITICAL" : ""}
						</div>
						{v.desc}
					</div>
				);
			})}
		</div>
	);
}
