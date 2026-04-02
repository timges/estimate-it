import { test, expect } from "@playwright/test";

test("room with card selected", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Your display name").first().fill("Alice");
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.waitForURL(/\/room\//);
  await page.getByRole("button", { name: "5" }).click();
  await expect(page).toHaveScreenshot("room-selected.png");
});
