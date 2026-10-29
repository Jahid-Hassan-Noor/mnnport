import { expect, test } from "@playwright/test";

test("yard recovery story follows the disruption state", async ({ page }) => {
  await page.goto("/yard");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  await page.getByRole("button", { name: "Open disruption scenario" }).click();
  await expect(page.getByRole("heading", { name: "Crane 3 is on a safety hold" })).toBeVisible();
  await page.getByRole("button", { name: "Create recovery proposal" }).click();
  await expect(page.locator(".story-panel")).toContainText("Proposal pending");
});

test("safety and audit stories expose scenario evidence", async ({ page }) => {
  await page.goto("/safety");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  await page.getByRole("button", { name: "Open safety scenario" }).click();
  await expect(page.getByRole("heading", { name: "Crane 3 held after an exclusion breach" })).toBeVisible();
  await expect(page.getByLabel("Safety response sequence")).toContainText(
    "automatically held",
  );
  await page.goto("/audit");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  const scenario = page.getByRole("button", {
    name: "Open safety evidence scenario",
  });
  if (await scenario.isVisible()) await scenario.click();
  await expect(page.locator(".story-panel")).toContainText(/\d+ events recorded/);
  await expect(page.getByText("Approval and incident trail")).toBeVisible();
});

test("gate flow reflects repeated release actions", async ({ page }) => {
  await page.goto("/gate");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  const release = page.getByRole("button", {
    name: "Release next appointment batch",
  });
  await release.click();
  await release.click();
  await expect(page.locator(".story-panel")).toContainText(
    "2 appointment batches released",
  );
  await expect(page.getByLabel("Gate flow")).toContainText(
    "8Trucks released by demo actions",
  );
});

test("customer and group views use a focused presentation layout", async ({ page }) => {
  for (const route of ["/shipping-line", "/group"]) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-interactive",
      "true",
    );
    await expect(page.locator(".overview-rail")).toHaveCount(0);
  }
  await page.goto("/shipping-line");
  await expect(page.getByText("ETA (MYT)")).toBeVisible();
});

test("story pages fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/berths", "/safety", "/shipping-line"]) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-interactive",
      "true",
    );
    await expect(page.locator(".story-panel")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `Unexpected horizontal overflow on ${route}`).toBe(false);
  }
});
