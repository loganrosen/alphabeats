import { describe, expect, it } from "vitest";
import type { Restaurant } from "../api.js";
import { recentRestaurantTimestamp } from "../recentRestaurants.js";

function restaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    camis: "50000001",
    dba: "TEST PLACE",
    boro: "Manhattan",
    building: "100",
    street: "MAIN ST",
    zipcode: "10001",
    phone: "",
    cuisine: "Japanese",
    lat: null,
    lng: null,
    inspections: {},
    latest: undefined,
    latestGraded: undefined,
    ...overrides,
  };
}

describe("recentRestaurantTimestamp", () => {
  it("uses recent closure metadata instead of unrelated later inspections", () => {
    expect(
      recentRestaurantTimestamp(
        restaurant({
          recentClosure: {
            status: "reopened",
            closureDate: "2025-01-15T00:00:00.000",
            reopenDate: "2025-01-24T00:00:00.000",
          },
          latest: {
            date: "2026-06-10T00:00:00.000",
            gradeDate: undefined,
            type: "Cycle Inspection / Initial Inspection",
            grade: "A",
            score: 10,
            violations: [],
            closed: false,
            reopened: false,
            reinspection: false,
          },
        }),
      ),
    ).toBe(new Date("2025-01-24T00:00:00.000").getTime());
  });
});
