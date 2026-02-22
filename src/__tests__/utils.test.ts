import { describe, expect, it } from "vitest";
import { expandAddress, fmtDate, norm } from "../utils.js";

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
