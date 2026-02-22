import { useState } from "react";
import type { Restaurant } from "../api.js";
import MapView from "./MapView.js";
import RestaurantCard from "./RestaurantCard.js";

interface SearchResult {
	status: "idle" | "loading" | "done" | "error";
	restaurants: Restaurant[];
	hitLimit: boolean;
	totalRows: number;
	error: string | null;
}

export default function ResultsGrid({ result }: { result: SearchResult }) {
	const { status, restaurants, hitLimit, totalRows, error } = result;
	const [view, setView] = useState<"list" | "map">("list");

	if (status === "idle")
		return (
			<div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
				<div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
					EAT
				</div>
				ENTER A RESTAURANT NAME, ADDRESS, OR BOROUGH TO BEGIN
			</div>
		);
	if (status === "loading")
		return (
			<div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
				<div className="w-7 h-7 border-2 border-zinc-400 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4 dark:border-zinc-800 dark:border-t-yellow-400" />
				SEARCHING…
			</div>
		);
	if (status === "error")
		return (
			<div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
				<div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
					!
				</div>
				{error}
			</div>
		);

	return (
		<>
			<div className="px-8 py-3 border-b border-zinc-200 flex items-center gap-4 font-mono text-sm text-zinc-500 tracking-wide flex-wrap dark:border-zinc-800 dark:text-zinc-300">
				<span className="text-zinc-800 font-medium dark:text-zinc-100">
					{restaurants.length.toLocaleString()} restaurant
					{restaurants.length !== 1 ? "s" : ""}
				</span>
				{hitLimit && (
					<span className="text-amber-500">
						⚠ Result limit reached — refine your search
					</span>
				)}
				<span className="ml-auto flex items-center gap-3">
					<span>{totalRows.toLocaleString()} inspection records</span>
					<div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-700 text-xs font-mono">
						<button
							onClick={() => setView("list")}
							className={`px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-1.5 ${view === "list" ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<line x1="1" y1="3" x2="11" y2="3" />
								<line x1="1" y1="6" x2="11" y2="6" />
								<line x1="1" y1="9" x2="11" y2="9" />
							</svg>
							List
						</button>
						<button
							onClick={() => setView("map")}
							className={`px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-1.5 border-l border-zinc-300 dark:border-zinc-700 ${view === "map" ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-500 hover:text-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<polygon points="1,9 4,2 7,6 9,4 11,9" />
								<circle cx="9" cy="3.5" r="1.5" />
							</svg>
							Map
						</button>
					</div>
				</span>
			</div>

			{restaurants.length === 0 ? (
				<div className="py-32 text-center font-mono text-sm text-zinc-500 tracking-widest dark:text-zinc-600">
					<div className="font-display text-8xl text-zinc-300 mb-4 leading-none dark:text-zinc-800">
						0
					</div>
					NO RESULTS — TRY BROADER TERMS
				</div>
			) : view === "list" ? (
				<div className="grid [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-px bg-zinc-200 dark:bg-zinc-800">
					{restaurants.map((r) => (
						<RestaurantCard key={r.camis} restaurant={r} />
					))}
				</div>
			) : (
				/* On md+: list left, map sticky right. On mobile: map only. */
				<div className="flex h-[calc(100vh-8rem)]">
					<div className="hidden md:flex flex-col overflow-y-auto w-[420px] shrink-0 divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-950">
						{restaurants.map((r) => (
							<RestaurantCard key={r.camis} restaurant={r} />
						))}
					</div>
					<div className="flex-1 min-w-0">
						<MapView restaurants={restaurants} />
					</div>
				</div>
			)}
		</>
	);
}
