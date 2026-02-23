import { useCallback, useState } from "react";

export interface GeoState {
	status: "idle" | "loading" | "success" | "error";
	lat: number | null;
	lng: number | null;
	error: string | null;
}

const IDLE: GeoState = { status: "idle", lat: null, lng: null, error: null };

export function useGeolocation() {
	const [geo, setGeo] = useState<GeoState>(IDLE);

	const locate = useCallback(() => {
		if (!navigator.geolocation) {
			setGeo({
				status: "error",
				lat: null,
				lng: null,
				error: "Geolocation is not supported by your browser",
			});
			return;
		}
		setGeo({ status: "loading", lat: null, lng: null, error: null });
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				setGeo({
					status: "success",
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					error: null,
				}),
			(err) =>
				setGeo({
					status: "error",
					lat: null,
					lng: null,
					error:
						err.code === err.PERMISSION_DENIED
							? "Location permission denied"
							: "Could not determine your location",
				}),
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	}, []);

	const clear = useCallback(() => setGeo(IDLE), []);

	return { geo, locate, clear };
}
