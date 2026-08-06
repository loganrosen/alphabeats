import { expect, test } from "@playwright/test";

test("production app starts without runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  await page.route("https://data.cityofnewyork.us/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: "[]",
    }),
  );
  await page.route("https://data.ny.gov/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: "[]",
    }),
  );

  await page.goto("/");

  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "SEARCH" })).toBeVisible();
  expect(pageErrors, "uncaught page errors").toEqual([]);
});
