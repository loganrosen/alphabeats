export const ABBREVS: Record<string, string> = {
	E: "EAST",
	W: "WEST",
	N: "NORTH",
	S: "SOUTH",
	NE: "NORTHEAST",
	NW: "NORTHWEST",
	SE: "SOUTHEAST",
	SW: "SOUTHWEST",
	ST: "STREET",
	STR: "STREET",
	AVE: "AVENUE",
	AV: "AVENUE",
	BLVD: "BOULEVARD",
	DR: "DRIVE",
	RD: "ROAD",
	PL: "PLACE",
	CT: "COURT",
	LN: "LANE",
	TER: "TERRACE",
	TERR: "TERRACE",
	PKWY: "PARKWAY",
	HWY: "HIGHWAY",
	TPKE: "TURNPIKE",
	EXPY: "EXPRESSWAY",
};

export function norm(s: string | undefined | null): string {
	return (s ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

// Returns normalized tokens with ordinal suffixes stripped and abbreviations
// expanded: "338 E 92nd St" → ["338", "EAST", "92", "STREET"]
export function expandAddress(input: string): string[] {
	return input
		.toUpperCase()
		.replace(/(\d+)\s*(ST|ND|RD|TH)\b/g, "$1")
		.split(/\s+/)
		.filter(Boolean)
		.map((t) => ABBREVS[t] ?? t);
}

export function fmtDate(d: string | undefined | null): string {
	if (!d) return "—";
	const dt = new Date(d);
	if (isNaN(dt.getTime()) || dt.getFullYear() < 2000) return "—";
	return dt.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Returns a short relative age string, e.g. "8mo ago" or "2y ago". */
export function fmtRelativeAge(d: string | undefined | null): string | null {
	if (!d) return null;
	const dt = new Date(d);
	if (isNaN(dt.getTime()) || dt.getFullYear() < 2000) return null;
	const months = Math.floor(
		(Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
	if (months < 1) return "this month";
	if (months < 12) return `${months}mo ago`;
	const years = Math.floor(months / 12);
	const rem = months % 12;
	return rem > 0 ? `${years}y ${rem}mo ago` : `${years}y ago`;
}

/** Returns a Tailwind color class based on how stale the inspection date is. */
export function inspectionStalenessClass(
	d: string | undefined | null,
	base = "text-zinc-400 dark:text-zinc-500",
): string {
	if (!d) return base;
	const dt = new Date(d);
	if (isNaN(dt.getTime())) return base;
	const months = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
	if (months >= 24) return "text-red-500 dark:text-red-400";
	if (months >= 12) return "text-amber-500 dark:text-amber-400";
	return base;
}
