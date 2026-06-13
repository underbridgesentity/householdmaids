import { Page, expect } from "@playwright/test";

export async function login(page: Page, email: string, password = "Password123!") {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
}

export async function logout(page: Page) {
  await page.goto("/app/profile").catch(() => {});
  const btn = page.getByRole("button", { name: "Log out" });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForURL("**/", { timeout: 20_000 }).catch(() => {});
  }
}

/** Drives the booking wizard from /app/book through to the paid track page. */
export async function bookAndPay(page: Page) {
  await page.goto("/app/book");
  await page.getByRole("button").filter({ hasText: "Standard Clean" }).first().click();
  await expect(page.getByText("Customise your clean")).toBeVisible();
  await page.getByRole("button", { name: /Continue ›/ }).click();
  await page.getByRole("button", { name: "Sandton", exact: true }).click();
  await page.getByRole("button", { name: /Continue to schedule/ }).click();
  await page.getByRole("button", { name: /Review booking/ }).click();
  await expect(page.getByText("Review & pay")).toBeVisible();
}

export { expect };
