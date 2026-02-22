import { useState } from "react";
import { Link } from "react-router-dom";
import type { Inspection, Restaurant, Violation } from "../api.js";
import { fmtDate, norm } from "../utils.js";
import { violationCategory } from "../violationCategory.js";
import GradeInfo from "./GradeInfo.js";

const GRADE_STYLES: Record<string, string> = {
	A: "bg-green-700",
	B: "bg-amber-600",
	C: "bg-red-600",
};

const GRADE_LABEL: Record<string, string> = {
	A: "A",
	B: "B",
	C: "C",
	N: "N",
	Z: "P",
	P: "P",
};

const GRADE_TEXT: Record<string, string> = {
	A: "text-green-700 dark:text-green-400",
	B: "text-amber-600 dark:text-amber-400",
	C: "text-red-600 dark:text-red-400",
};

function EmojiSet({
	violations,
}: {
	violations: { code: string; desc: string }[];
}) {
	const seen = new Map<string, string>();
	for (const v of violations) {
		const { emoji, label } = violationCategory(v.code, v.desc);
		if (!seen.has(emoji)) seen.set(emoji, label);
	}
	return (
		<>
			{[...seen.entries()].map(([emoji, label]) => (
				<span key={emoji} title={label} className="cursor-default">
					{emoji}
				</span>
			))}
		</>
	);
}

function abbrevInspType(type: string | undefined): string {
	if (!type) return "";
	const part = type.split("/").pop()?.trim() ?? type;
	const p = part.toLowerCase();
	if (p.includes("re-inspection") || p.includes("reinspection"))
		return "Re-insp";
	if (p.includes("initial")) return "Initial";
	if (p.includes("pre-permit")) return "Pre-permit";
	if (p.includes("compliance")) return "Compliance";
	if (p.includes("reopening")) return "Reopening";
	if (p.includes("smoke") || p.includes("calorie") || p.includes("trans fat"))
		return "Special";
	if (p.includes("admin")) return "Admin";
	if (p.includes("inspected")) return "Inspected";
	return part.length > 14 ? part.slice(0, 12) + "…" : part;
}

function ViolationList({ violations }: { violations: Violation[] }) {
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

function InspectionRow({
	insp,
	isLatest,
}: {
	insp: Inspection;
	isLatest: boolean;
}) {
	const [open, setOpen] = useState(false);
	const grade = insp.grade ?? null;
	const critCount = insp.violations.filter((v) => v.critical).length;

	return (
		<div
			className={`rounded border ${isLatest ? "border-zinc-300 dark:border-zinc-600" : "border-zinc-200 dark:border-zinc-800"}`}
		>
			<div
				className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 cursor-pointer select-none ${insp.violations.length > 0 ? "hover:bg-zinc-50 dark:hover:bg-zinc-900" : ""}`}
				onClick={() => insp.violations.length > 0 && setOpen((o) => !o)}
			>
				{/* Left: grade + date + type + score */}
				<span
					className={`font-display text-base w-6 text-center shrink-0 ${GRADE_TEXT[grade ?? ""] ?? "text-zinc-400"}`}
				>
					{grade ? (GRADE_LABEL[grade] ?? grade) : "—"}
				</span>
				<span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
					{fmtDate(insp.date)}
				</span>
				<span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
					{abbrevInspType(insp.type)}
				</span>
				{insp.score != null && (
					<span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
						· {insp.score}pts
					</span>
				)}

				{/* Right: crit + emojis + arrow */}
				<div className="ml-auto flex items-center gap-1.5 shrink-0">
					{critCount > 0 && (
						<span className="font-mono text-xs text-red-500 dark:text-red-400">
							{critCount}✕ crit
						</span>
					)}
					{insp.violations.length > 0 && (
						<>
							<span className="text-xs">
								<EmojiSet violations={insp.violations} />
							</span>
							<span
								className={`font-mono text-xs text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
							>
								▶
							</span>
						</>
					)}
				</div>
			</div>

			{open && insp.violations.length > 0 && (
				<div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
					<ViolationList violations={insp.violations} />
				</div>
			)}
		</div>
	);
}

export default function RestaurantCard({
	restaurant: r,
}: {
	restaurant: Restaurant;
}) {
	const [historyOpen, setHistoryOpen] = useState(false);

	const insp = r.latest;
	const gradedInsp = r.latestGraded;
	const neverInspected = !insp;
	const grade = gradedInsp?.grade ?? null;
	const streetPart = [r.building, norm(r.street)].filter(Boolean).join(" ");
	const addr = [streetPart, r.zipcode, r.boro].filter(Boolean).join(" · ");
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.dba, streetPart, r.zipcode, "New York NY"].filter(Boolean).join(" "))}`;
	const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(r.dba)}&find_loc=${encodeURIComponent([streetPart, r.zipcode, "New York NY"].filter(Boolean).join(", "))}`;
	const allInspections = Object.values(r.inspections).sort(
		(a, b) =>
			new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
	);

	const latestCritCount = (insp?.violations ?? []).filter(
		(v) => v.critical,
	).length;

	// Score trend: compare latest scored inspection to the one before it
	// Lower score = fewer violation points = better
	const scoredInspections = allInspections.filter(
		(i) => i.score != null && i.grade,
	);
	const trendArrow = (() => {
		if (scoredInspections.length < 2) return null;
		const diff = scoredInspections[0].score! - scoredInspections[1].score!;
		if (diff < -1)
			return {
				arrow: "↓",
				title: "Violation points improving",
				cls: "text-green-600 dark:text-green-400",
			};
		if (diff > 1)
			return {
				arrow: "↑",
				title: "Violation points worsening",
				cls: "text-red-500 dark:text-red-400",
			};
		return {
			arrow: "→",
			title: "Violation points stable",
			cls: "text-zinc-400 dark:text-zinc-500",
		};
	})();

	const oneYearAgo = new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
	const recentViolations = allInspections
		.filter((i) => i.date && new Date(i.date) >= oneYearAgo)
		.flatMap((i) => i.violations);

	return (
		<div className="bg-white hover:bg-zinc-50 transition-colors p-5 flex flex-col gap-3 min-w-0 dark:bg-zinc-950 dark:hover:bg-zinc-900 group">
			<div className="flex justify-between items-start gap-4">
				<div>
					<Link
						data-restaurant-link
						to={`/restaurant/${r.camis}`}
						state={{ restaurant: r }}
						className="font-semibold text-lg leading-snug text-zinc-900 dark:text-zinc-100 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
					>
						{r.dba}
						<span className="ml-1.5 text-zinc-400 dark:text-zinc-500 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors text-base font-normal">
							→
						</span>
					</Link>
					<div className="font-mono text-sm text-zinc-500 mt-1 tracking-tight dark:text-zinc-300 flex items-center gap-2 flex-wrap">
						<a
							href={mapsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
						>
							{addr}
						</a>
						{r.phone && (
							<a
								href={`tel:${r.phone}`}
								className="hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors opacity-60 hover:opacity-100"
							>
								📞
							</a>
						)}
					</div>
				</div>
				{neverInspected ? (
					<div className="w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
						<span className="font-mono text-xs text-center leading-tight tracking-tight px-0.5">
							NOT YET
						</span>
					</div>
				) : (
					<div
						className={`${GRADE_STYLES[grade ?? ""] ?? "bg-zinc-400 dark:bg-zinc-700"} w-11 h-14 rounded shrink-0 flex flex-col items-center justify-center relative text-white`}
					>
						<span className="font-display text-3xl leading-none">
							{GRADE_LABEL[grade ?? ""] ?? grade ?? "?"}
						</span>
						<span className="font-mono text-[0.45rem] tracking-widest absolute bottom-1.5 opacity-75">
							{grade === "Z" || grade === "P"
								? "PENDING"
								: grade === "N"
									? "UNGRADED"
									: "GRADE"}
						</span>
					</div>
				)}
			</div>

			{r.cuisine && (
				<div>
					<span className="font-mono text-xs text-zinc-600 tracking-wide uppercase border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-300 dark:border-zinc-700">
						{r.cuisine}
					</span>
				</div>
			)}
			<div className="flex gap-1.5 flex-wrap items-center">
				{insp?.score != null && (
					<span className="font-mono text-xs text-zinc-700 tracking-wide border border-zinc-300 rounded px-2 py-0.5 dark:text-zinc-100 dark:border-zinc-700">
						{insp.score} pts
					</span>
				)}
				{trendArrow && (
					<span
						title={trendArrow.title}
						className={`font-mono text-sm font-bold cursor-default ${trendArrow.cls}`}
					>
						{trendArrow.arrow}
					</span>
				)}
				{(insp?.score != null || grade) && (
					<GradeInfo align="left" direction="up" />
				)}
				{latestCritCount > 0 && (
					<span className="font-mono text-xs text-red-600 border border-red-300 rounded px-2 py-0.5 dark:text-red-300 dark:border-red-800">
						{latestCritCount} critical
					</span>
				)}
			</div>

			{allInspections.length > 0 && (
				<>
					<button
						onClick={() => setHistoryOpen((o) => !o)}
						className="font-mono text-sm text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-left cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-100"
					>
						<span
							className={`transition-transform ${historyOpen ? "rotate-90" : ""}`}
						>
							▶
						</span>
						{allInspections.length} INSPECTION
						{allInspections.length !== 1 ? "S" : ""}
						{recentViolations.length > 0 && (
							<span className="flex items-center gap-0.5 ml-1">
								<EmojiSet violations={recentViolations} />
								<span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 ml-0.5">
									12mo
								</span>
							</span>
						)}
					</button>

					{historyOpen && (
						<div className="flex flex-col gap-1.5">
							{allInspections.map((i, idx) => (
								<InspectionRow key={idx} insp={i} isLatest={i === insp} />
							))}
						</div>
					)}
				</>
			)}

			<div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-200 mt-auto dark:border-zinc-800">
				<span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
					{neverInspected
						? "No inspection on record"
						: `Last inspected ${fmtDate(insp?.date)}`}
				</span>
				<div className="flex items-center gap-3">
					<a
						href={yelpUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
					>
						Yelp ↗
					</a>
					<a
						href={`https://a816-health.nyc.gov/ABCEatsRestaurants/#!/Search/${r.camis}`}
						target="_blank"
						rel="noopener noreferrer"
						className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
					>
						NYC Health ↗
					</a>
				</div>
			</div>
		</div>
	);
}
