import { test, expect } from "@playwright/test";

test("revealed state", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Your display name").first().fill("Alice");
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.waitForURL(/\/room\//);
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();
  await expect(page.getByText("All Estimates Revealed")).toBeVisible();
  await expect(page).toHaveScreenshot("revealed.png");
});
