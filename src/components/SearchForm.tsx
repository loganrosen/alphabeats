import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react";
import { useState } from "react";
import type { CommunityBoard, SearchParams } from "../api.js";
import CuisineCombobox from "./CuisineCombobox.js";

const BOROUGHS = [
	"Manhattan",
	"Brooklyn",
	"Queens",
	"Bronx",
	"Staten Island",
] as const;

const inputCls =
	"w-full bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 rounded-md px-3 py-2.5 text-base focus:outline-none focus:border-yellow-500 transition-colors dark:bg-zinc-950 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-yellow-400";
const labelCls =
	"font-mono text-xs text-zinc-500 tracking-widest uppercase dark:text-zinc-300";

interface Props {
	values: SearchParams;
	onChange: (fn: (prev: SearchParams) => SearchParams) => void;
	onSearch: () => void;
	onClear: () => void;
	onNearby: () => void;
	nearbyStatus: "idle" | "loading" | "success" | "error";
	nearbyError: string | null;
	nearbyRadius: number;
	onRadiusChange: (r: number) => void;
	loading: boolean;
	cuisines: string[];
	communityBoards: CommunityBoard[];
}

function CommunityBoardCombobox({
	value,
	onChange,
	communityBoards,
	boroFilter,
}: {
	value: string;
	onChange: (code: string) => void;
	communityBoards: CommunityBoard[];
	boroFilter: string[];
}) {
	const filtered = communityBoards.filter(
		(cb) =>
			boroFilter.length === 0 ||
			boroFilter.some((b) => cb.borough.toLowerCase() === b.toLowerCase()),
	);
	const selected = communityBoards.find((cb) => cb.code === value) ?? null;
	const [query, setQuery] = useState("");

	const matches = query
		? filtered.filter((cb) =>
				cb.label.toLowerCase().includes(query.toLowerCase()),
			)
		: filtered;

	const displayValue = (cb: CommunityBoard | null) =>
		cb ? shortLabel(cb.label) : "";

	// Truncate to the first two comma-separated neighborhoods, adding "…" if more exist
	function shortLabel(label: string) {
		const parts = label.split(/,\s*/);
		if (parts.length <= 2) return label;
		return parts.slice(0, 2).join(", ") + "…";
	}

	function highlight(text: string, q: string) {
		if (!q) return <>{text}</>;
		const idx = text.toLowerCase().indexOf(q.toLowerCase());
		if (idx === -1) return <>{text}</>;
		return (
			<>
				{text.slice(0, idx)}
				<mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm">
					{text.slice(idx, idx + q.length)}
				</mark>
				{text.slice(idx + q.length)}
			</>
		);
	}

	// Derive a short human-readable CB label from the numeric code, e.g. "108" → "CB 8"
	const cbShort = (code: string) => `CB ${parseInt(code.slice(1), 10)}`;

	return (
		<Combobox
			value={selected}
			onChange={(cb) => {
				onChange(cb?.code ?? "");
				setQuery("");
			}}
			onClose={() => setQuery("")}
		>
			<ComboboxInput
				className={inputCls + (value ? " pr-8" : "")}
				displayValue={displayValue}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Any neighborhood"
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg leading-none cursor-pointer"
				>
					×
				</button>
			)}
			{matches.length > 0 && (
				<ComboboxOptions
					anchor="bottom start"
					className="z-50 w-96 max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg mt-1 py-1 font-sans text-sm"
				>
					{matches.map((cb) => (
						<ComboboxOption
							key={cb.code}
							value={cb}
							className={({ focus }) =>
								`px-3 py-1.5 cursor-pointer flex items-center justify-between gap-2
                ${focus ? "bg-yellow-50 dark:bg-yellow-900/20 text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`
							}
						>
							{({ selected: sel }) => (
								<>
									<span className="leading-snug">
										{highlight(cb.label, query)}
									</span>
									<span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0">
										{cbShort(cb.code)}
										{sel ? " ✓" : ""}
									</span>
								</>
							)}
						</ComboboxOption>
					))}
				</ComboboxOptions>
			)}
		</Combobox>
	);
}

export default function SearchForm({
	values,
	onChange,
	onSearch,
	onClear,
	onNearby,
	nearbyStatus,
	nearbyError,
	nearbyRadius,
	onRadiusChange,
	loading,
	cuisines,
	communityBoards,
}: Props) {
	const set =
		(key: keyof SearchParams) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
			onChange((v) => ({ ...v, [key]: e.target.value }));
	const onKey = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") onSearch();
	};

	const hasAdvancedFilters =
		values.address !== "" ||
		values.zip !== "" ||
		values.cb !== "" ||
		values.grade.length > 0;
	const [showAdvanced, setShowAdvanced] = useState(hasAdvancedFilters);

	return (
		<div className="bg-zinc-100 border-b border-zinc-200 px-8 py-4 dark:bg-zinc-900 dark:border-zinc-800">
			{/* Primary row: Name, Cuisine, Borough, Search, Near Me, Clear */}
			<div className="grid grid-cols-[2fr_1.5fr_1.2fr_auto] gap-3 max-w-6xl items-end max-[800px]:grid-cols-1">
				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Restaurant Name</label>
					<input
						className={inputCls}
						value={values.name}
						onChange={set("name")}
						onKeyDown={onKey}
						placeholder="e.g. Drunken Munkey"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Cuisine</label>
					<CuisineCombobox
						value={values.cuisine}
						onChange={(v) => onChange((prev) => ({ ...prev, cuisine: v }))}
						cuisines={cuisines}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Borough</label>
					<div className="flex gap-1.5 flex-wrap py-0.5">
						{BOROUGHS.map((b) => {
							const short =
								b === "Staten Island"
									? "SI"
									: b === "Manhattan"
										? "MN"
										: b === "Brooklyn"
											? "BK"
											: b === "Queens"
												? "QN"
												: "BX";
							const active = values.boro.includes(b);
							return (
								<button
									key={b}
									type="button"
									onClick={() =>
										onChange((prev) => ({
											...prev,
											boro: active
												? prev.boro.filter((x) => x !== b)
												: [...prev.boro, b],
											cb: "",
										}))
									}
									title={b}
									className={`font-mono text-xs px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer
                    ${
											active
												? "bg-yellow-400 border-yellow-400 text-zinc-950"
												: "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
										}`}
								>
									{short}
								</button>
							);
						})}
					</div>
				</div>
				<div className="flex items-end gap-2">
					<button
						onClick={onSearch}
						disabled={loading}
						className="font-display text-lg tracking-wide bg-yellow-400 text-zinc-950 px-6 py-2.5 rounded-md cursor-pointer hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
					>
						{loading ? "…" : "SEARCH"}
					</button>
					<button
						onClick={onClear}
						className="font-mono text-sm tracking-widest text-zinc-600 border border-zinc-300 px-4 py-2.5 rounded-md cursor-pointer hover:text-zinc-900 hover:border-zinc-500 transition-colors whitespace-nowrap dark:text-zinc-300 dark:border-zinc-600 dark:hover:text-white dark:hover:border-zinc-400"
					>
						CLEAR
					</button>
				</div>
			</div>

			{/* Action row: Near Me + More Filters toggle */}
			<div className="flex items-center gap-4 max-w-6xl mt-3 flex-wrap">
				<div className="flex items-center gap-1.5">
					<button
						onClick={onNearby}
						disabled={loading || nearbyStatus === "loading"}
						className="font-mono text-sm tracking-widest text-zinc-600 border border-zinc-300 px-4 py-2 rounded-l-md cursor-pointer hover:text-zinc-900 hover:border-zinc-500 transition-colors whitespace-nowrap dark:text-zinc-300 dark:border-zinc-600 dark:hover:text-white dark:hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
						title="Find restaurants near your current location"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
							<circle cx="12" cy="12" r="3" />
							<line x1="12" y1="2" x2="12" y2="5" />
							<line x1="12" y1="19" x2="12" y2="22" />
							<line x1="2" y1="12" x2="5" y2="12" />
							<line x1="19" y1="12" x2="22" y2="12" />
						</svg>
						{nearbyStatus === "loading" ? "…" : "NEAR ME"}
					</button>
					<div className="flex border-y border-r border-zinc-300 dark:border-zinc-600 rounded-r-md overflow-hidden">
						{([0.1, 0.25, 0.5, 1] as const).map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => onRadiusChange(r)}
								className={`font-mono text-xs px-2 py-2 cursor-pointer transition-colors whitespace-nowrap
									${nearbyRadius === r
										? "bg-yellow-400 text-zinc-950"
										: "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
									}`}
							>
								{r < 1 ? `${r}` : `${r}`}mi
							</button>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={() => setShowAdvanced((o) => !o)}
					className="font-mono text-xs tracking-widest text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5"
				>
					<span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
					MORE FILTERS
					{hasAdvancedFilters && !showAdvanced && (
						<span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
					)}
				</button>
			</div>

			{nearbyStatus === "error" && nearbyError && (
				<div className="font-mono text-xs text-red-500 mt-2 dark:text-red-400">
					{nearbyError}
				</div>
			)}

			{/* Advanced filters: Address, Zip, Neighborhood, Grade */}
			{showAdvanced && (
				<div className="grid grid-cols-[1.5fr_0.8fr_1.2fr_0.8fr] gap-3 max-w-6xl mt-3 items-end max-[800px]:grid-cols-1">
					<div className="flex flex-col gap-1.5">
						<label className={labelCls}>Street Address</label>
						<input
							className={inputCls}
							value={values.address}
							onChange={set("address")}
							onKeyDown={onKey}
							placeholder="e.g. 338 E 92nd St"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className={labelCls}>Zip Code</label>
						<input
							className={inputCls}
							value={values.zip}
							onChange={set("zip")}
							onKeyDown={onKey}
							placeholder="e.g. 10128"
							maxLength={5}
						/>
					</div>
					<div className="flex flex-col gap-1.5 relative">
						<label className={labelCls}>Neighborhood</label>
						<CommunityBoardCombobox
							value={values.cb}
							onChange={(code) => onChange((prev) => ({ ...prev, cb: code }))}
							communityBoards={communityBoards}
							boroFilter={values.boro}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className={labelCls}>Grade</label>
						<div className="flex gap-1.5 flex-wrap py-0.5">
							{(
								[
									["A", "A"],
									["B", "B"],
									["C", "C"],
									["N", "N/A"],
									["Z", "Pend"],
								] as [string, string][]
							).map(([code, label]) => {
								const active = values.grade.includes(code);
								return (
									<button
										key={code}
										type="button"
										onClick={() =>
											onChange((prev) => ({
												...prev,
												grade: active
													? prev.grade.filter((g) => g !== code)
													: [...prev.grade, code],
											}))
										}
										className={`font-mono text-xs px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer
                    ${
											active
												? "bg-yellow-400 border-yellow-400 text-zinc-950 dark:bg-yellow-400 dark:border-yellow-400"
												: "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
										}`}
									>
										{label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
