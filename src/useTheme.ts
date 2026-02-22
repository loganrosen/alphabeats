import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(
		() => (localStorage.getItem("theme") as Theme) ?? "system",
	);

	const setTheme = (t: Theme) => {
		if (t === "system") localStorage.removeItem("theme");
		else localStorage.setItem("theme", t);
		setThemeState(t);
	};

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "system") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			root.classList.toggle("dark", mq.matches);
			const handler = (e: MediaQueryListEvent) =>
				root.classList.toggle("dark", e.matches);
			mq.addEventListener("change", handler);
			return () => mq.removeEventListener("change", handler);
		} else {
			root.classList.toggle("dark", theme === "dark");
		}
	}, [theme]);

	return { theme, setTheme };
}
