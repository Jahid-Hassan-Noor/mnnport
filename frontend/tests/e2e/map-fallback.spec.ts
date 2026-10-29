import { expect, test } from "@playwright/test";

test("the port stays visible when WebGL cannot start", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...arguments_: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(getContext, this, [type, ...arguments_]);
    } as typeof getContext;
  });
  await page.goto("/control");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-interactive",
    "true",
  );
  const preview = page.getByTestId("map-preview");
  await expect(preview).toBeVisible();
  await expect(preview.locator(".preview-stack")).toHaveCount(400);
  await expect(preview.locator(".preview-vehicle")).toHaveCount(40);
  await expect(preview.locator(".preview-vessel")).toHaveCount(3);
  await expect(page.locator(".diorama-preview svg")).toBeVisible();
  await expect(page.locator(".map-preview-note")).toBeVisible({
    timeout: 12_000,
  });
  await page.getByRole("button", { name: "View container yard" }).click();
  await expect(preview.locator("svg")).toHaveAttribute(
    "viewBox",
    "95 300 760 330",
  );
});
