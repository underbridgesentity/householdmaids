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
  // The desktop sidebar and the profile screen both render a "Log out" button —
  // use .first() to avoid a strict-mode multiple-match error.
  const btn = page.getByRole("button", { name: "Log out" }).first();
  await btn.click().catch(() => {});
  await page
    .waitForURL((u) => !u.pathname.startsWith("/app") && !u.pathname.startsWith("/helper"), { timeout: 20_000 })
    .catch(() => {});
}

/** Drives the booking wizard from /book through to the review step. */
export async function bookAndPay(page: Page) {
  await page.goto("/book");
  await page.getByRole("button").filter({ hasText: "Standard Clean" }).first().click();
  await expect(page.getByText("Customise your clean")).toBeVisible();
  await page.getByRole("button", { name: /Continue ›/ }).click();
  await page.getByRole("button", { name: "Sandton", exact: true }).click();
  await page.getByRole("button", { name: /Continue to schedule/ }).click();
  await page.getByRole("button", { name: /Review booking/ }).click();
  await expect(page.getByText("Review & pay")).toBeVisible();
}

export { expect };
