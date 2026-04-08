import { expect, test } from "@playwright/test";

test("revealed state", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("John Doe").first().fill("Alice");
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.waitForURL(/\/room\//);
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  await expect(page).toHaveScreenshot("revealed.png");
});
