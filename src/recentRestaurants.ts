import type { Restaurant } from "./api.js";

export function recentRestaurantTimestamp(r: Restaurant): number {
  const date =
    r.recentClosure?.reopenDate ??
    r.recentClosure?.closureDate ??
    r.latest?.date;
  return new Date(date ?? "").getTime();
}
