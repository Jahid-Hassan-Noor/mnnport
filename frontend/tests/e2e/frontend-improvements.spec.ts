import { test, expect } from "@playwright/test";

test("keyboard help takes focus and returns it to the trigger", async ({
  page,
}) => {
  await page.goto("/control");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  const trigger = page.getByRole("button", { name: "Keyboard shortcuts" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close keyboard shortcuts" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("dialog")?.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("berth replan works without dragging and reports the result", async ({
  page,
}) => {
  await page.goto("/berths");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  await page.getByRole("combobox", { name: "Target berth" }).selectOption("B3");
  await page.getByRole("button", { name: "Review replan" }).click();
  await expect(page.getByText(/Move MV Kedah Pearl to B3/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm replan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "MV Kedah Pearl is now assigned to B3",
  );
});

test("visible role restricted actions explain why they are unavailable", async ({
  page,
}) => {
  await page.goto("/berths");
  await page
    .getByRole("combobox", { name: "Demo role", exact: true })
    .selectOption("group_executive");
  await expect(
    page.getByRole("button", { name: "Review replan" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "This demo role can inspect the berth plan but cannot change it.",
    ),
  ).toBeVisible();
  await page.goto("/gate");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  await page
    .getByRole("combobox", { name: "Demo role", exact: true })
    .selectOption("group_executive");
  await expect(
    page.getByRole("button", { name: "Release next appointment batch" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "This demo role can view gate operations but cannot release a batch.",
    ),
  ).toBeVisible();
  await page.goto("/cyber");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  await page
    .getByRole("combobox", { name: "Demo role", exact: true })
    .selectOption("group_executive");
  await expect(
    page.getByRole("button", { name: "Inject low-severity test event" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "This demo role can inspect OT events but cannot inject a test event.",
    ),
  ).toBeVisible();
});

test("phone navigation exposes portals, roles and stage controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/control");
  await expect(
    page.getByRole("button", { name: "Open portals and demo settings" }),
  ).toBeVisible();
  await expect(page.locator(".status-strip .strip-right")).toBeHidden();
  await page
    .getByRole("button", { name: "Open portals and demo settings" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Compact portals" }).getByRole("link"),
  ).toHaveCount(10);
  await expect(
    page.getByRole("combobox", { name: "Demo role in compact menu" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run Stage Demo · 5 minutes" }),
  ).toBeVisible();
});

test("map layer options stay out of the map until requested", async ({
  page,
}) => {
  await page.goto("/control");
  await expect(page.locator(".map-layers")).toHaveCount(0);
  await page.getByRole("button", { name: "Layers" }).click();
  await expect(page.getByRole("checkbox", { name: "Vessels" })).toBeVisible();
  await page.getByRole("button", { name: "Layers" }).click();
  await expect(page.locator(".map-layers")).toHaveCount(0);
});
