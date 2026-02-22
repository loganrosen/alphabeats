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
