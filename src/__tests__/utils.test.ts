import { describe, expect, it } from "vitest";
import { expandAddress, fmtDate, fmtRelativeAge, inspectionStalenessClass, norm } from "../utils.js";

// Helper: build an ISO date string N months in the past, using the same
// 30.44-day constant as fmtRelativeAge so boundary tests are exact.
function monthsAgo(n: number): string {
	return new Date(Date.now() - n * 30.44 * 24 * 60 * 60 * 1000).toISOString();
}

describe("norm", () => {
	it("uppercases", () => expect(norm("hello")).toBe("HELLO"));
	it("collapses whitespace", () =>
		expect(norm("  foo   bar  ")).toBe("FOO BAR"));
	it("handles empty string", () => expect(norm("")).toBe(""));
	it("handles null", () => expect(norm(null)).toBe(""));
	it("handles undefined", () => expect(norm(undefined)).toBe(""));
});

describe("expandAddress", () => {
	it("strips ordinal suffixes", () => {
		expect(expandAddress("92nd St")).toContain("92");
		expect(expandAddress("1st Ave")).toContain("1");
		expect(expandAddress("23rd Street")).toContain("23");
	});

	it("expands directional abbreviations", () => {
		expect(expandAddress("338 E 92nd St")).toContain("EAST");
		expect(expandAddress("10 W 42nd")).toContain("WEST");
	});

	it("expands street type abbreviations", () => {
		expect(expandAddress("338 E 92nd St")).toContain("STREET");
		expect(expandAddress("5th Ave")).toContain("AVENUE");
		expect(expandAddress("Sunset Blvd")).toContain("BOULEVARD");
	});

	it("does not expand tokens that are not abbreviations", () => {
		const tokens = expandAddress("338 EAST 92 STREET");
		expect(tokens).toContain("338");
		expect(tokens).toContain("EAST");
		expect(tokens).toContain("92");
		expect(tokens).toContain("STREET");
	});

	it("handles mixed case input", () => {
		const tokens = expandAddress("10 e 14th st");
		expect(tokens).toContain("EAST");
		expect(tokens).toContain("14");
		expect(tokens).toContain("STREET");
	});
});

describe("fmtDate", () => {
	it("formats a valid date", () => {
		const result = fmtDate("2024-06-15T00:00:00.000");
		expect(result).toMatch(/Jun/);
		expect(result).toMatch(/15/);
		expect(result).toMatch(/2024/);
	});

	it("returns em dash for undefined", () =>
		expect(fmtDate(undefined)).toBe("—"));
	it("returns em dash for null", () => expect(fmtDate(null)).toBe("—"));
	it("returns em dash for empty string", () => expect(fmtDate("")).toBe("—"));
	it("returns em dash for pre-2000 sentinel date", () => {
		expect(fmtDate("1900-01-01T00:00:00.000")).toBe("—");
	});
});

describe("fmtRelativeAge", () => {
	it("returns null for null/undefined/empty", () => {
		expect(fmtRelativeAge(null)).toBeNull();
		expect(fmtRelativeAge(undefined)).toBeNull();
		expect(fmtRelativeAge("")).toBeNull();
	});

	it("returns null for pre-2000 sentinel date", () => {
		expect(fmtRelativeAge("1900-01-01T00:00:00.000")).toBeNull();
	});

	it("returns 'this month' for a recent date", () => {
		expect(fmtRelativeAge(monthsAgo(0))).toBe("this month");
	});

	it("returns months for dates under a year old", () => {
		expect(fmtRelativeAge(monthsAgo(3))).toBe("3mo ago");
		expect(fmtRelativeAge(monthsAgo(11))).toBe("11mo ago");
	});

	it("returns whole years when no remainder", () => {
		expect(fmtRelativeAge(monthsAgo(12))).toBe("1y ago");
		expect(fmtRelativeAge(monthsAgo(24))).toBe("2y ago");
	});

	it("includes remaining months for non-round years", () => {
		expect(fmtRelativeAge(monthsAgo(14))).toBe("1y 2mo ago");
		expect(fmtRelativeAge(monthsAgo(27))).toBe("2y 3mo ago");
	});
});

describe("inspectionStalenessClass", () => {
	it("returns base class for null/undefined", () => {
		const base = "text-zinc-400 dark:text-zinc-500";
		expect(inspectionStalenessClass(null)).toBe(base);
		expect(inspectionStalenessClass(undefined)).toBe(base);
	});

	it("returns base class for fresh inspection (< 12 months)", () => {
		const base = "text-zinc-400 dark:text-zinc-500";
		expect(inspectionStalenessClass(monthsAgo(6))).toBe(base);
	});

	it("returns amber class for 12–23 month old inspection", () => {
		expect(inspectionStalenessClass(monthsAgo(13))).toBe(
			"text-amber-500 dark:text-amber-400",
		);
		expect(inspectionStalenessClass(monthsAgo(23))).toBe(
			"text-amber-500 dark:text-amber-400",
		);
	});

	it("returns red class for 24+ month old inspection", () => {
		expect(inspectionStalenessClass(monthsAgo(24))).toBe(
			"text-red-500 dark:text-red-400",
		);
		expect(inspectionStalenessClass(monthsAgo(36))).toBe(
			"text-red-500 dark:text-red-400",
		);
	});

	it("accepts a custom base class", () => {
		const custom = "text-zinc-300";
		expect(inspectionStalenessClass(monthsAgo(3), custom)).toBe(custom);
	});
});
