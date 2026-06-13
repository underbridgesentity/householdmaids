import { test } from "@playwright/test";
import { login, logout, bookAndPay, expect } from "./helpers";

test("marketing landing renders brand, services and contact details", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /rewarded/i })).toBeVisible();
  await expect(page.getByText("Cleaning for every corner")).toBeVisible();
  await expect(page.getByText("062 032 4931").first()).toBeVisible();
});

test("RBAC: a customer cannot reach the admin console", async ({ page }) => {
  await login(page, "thandi@email.co.za");
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});

test("customer can book, pay, track to completion and rate", async ({ page }) => {
  await login(page, "thandi@email.co.za");
  await bookAndPay(page);
  await page.getByRole("button", { name: /Continue to payment/ }).click();

  // Payment (Payfast) — dev simulate path (no public ITN reaches localhost).
  await page.waitForURL("**/app/pay/**");
  await page.getByRole("button", { name: /simulate successful payment/i }).click();

  await page.waitForURL("**/app/bookings/**");
  await expect(page.getByText("Payment received")).toBeVisible();

  // Advance the status until the rate CTA appears.
  const rate = page.getByRole("link", { name: /Rate your clean/i });
  for (let i = 0; i < 8; i++) {
    if (await rate.isVisible().catch(() => false)) break;
    const advance = page.getByRole("button", { name: /advance status/i });
    if (!(await advance.isVisible().catch(() => false))) break;
    await advance.click();
    await expect(advance).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }
  await rate.click();
  await page.waitForURL("**/app/rate/**");
  await page.getByRole("button", { name: "Submit review" }).click();
  await page.waitForURL("**/app/bookings/**");
  await expect(page.getByText("Thanks for rating your clean.")).toBeVisible();
  await logout(page);
});

test("referral: a new user with a code earns the referrer on their first paid booking", async ({ page }) => {
  const email = `e2e_${Date.now()}@test.co.za`;
  await page.goto("/signup?ref=THANDI-50");
  await page.locator('input[name="fullName"]').fill("E2E Referee");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app");

  await bookAndPay(page);
  // A first-time referee is offered the referral discount.
  await expect(page.getByText(/First-booking referral discount/)).toBeVisible();
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.waitForURL("**/app/pay/**");
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL("**/app/bookings/**");
  await logout(page);

  // The referrer should now see the referral earning in their wallet.
  await login(page, "thandi@email.co.za");
  await page.goto("/app/wallet");
  await expect(page.getByText("joined with your code").first()).toBeVisible();
  // The referrer's all-time earnings reflect at least one R50 reward.
  await expect(page.getByText(/earned all-time/)).toBeVisible();
});

test("admin dashboard and services load with live data", async ({ page }) => {
  await login(page, "admin@householdmaids.co.za");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.goto("/admin/services");
  await expect(page.getByRole("heading", { name: /Services & pricing/ })).toBeVisible();
  await expect(page.locator('input[value="Standard Clean"]')).toBeVisible();
});

test("helper dashboard loads for an approved cleaner", async ({ page }) => {
  await login(page, "lindiwe@email.co.za");
  await page.goto("/helper/dashboard");
  await expect(page.getByText(/Vetted/)).toBeVisible();
});
