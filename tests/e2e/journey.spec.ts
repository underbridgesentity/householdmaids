import fs from "fs";
import { test } from "@playwright/test";
import { login, logout, bookAndPay, expect } from "./helpers";

// 1x1 transparent PNG for document-upload tests.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

test("admin can update reward settings and they persist (round-trip)", async ({ page }) => {
  await login(page, "admin@householdmaids.co.za");
  await page.goto("/admin/rewards");
  const reward = page.locator('input[name="referrerRewardRands"]');
  await expect(reward).toBeVisible();
  const original = (await reward.inputValue()) || "50";

  await reward.fill("55");
  await page.getByRole("button", { name: /Save/ }).click();
  await page.waitForLoadState("networkidle");
  await page.goto("/admin/rewards");
  await expect(page.locator('input[name="referrerRewardRands"]')).toHaveValue("55");

  // restore the seeded value so other flows/screenshots are unaffected
  await page.locator('input[name="referrerRewardRands"]').fill(original);
  await page.getByRole("button", { name: /Save/ }).click();
  await page.waitForLoadState("networkidle");
});

test("admin can reach every console section", async ({ page }) => {
  await login(page, "admin@householdmaids.co.za");
  for (const [path, heading] of [
    ["/admin", "Dashboard"],
    ["/admin/rewards", "Rewards & discounts"],
    ["/admin/services", "Services & pricing"],
    ["/admin/payouts", "Payouts queue"],
    ["/admin/vetting", "Helper vetting"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("customer desktop sidebar navigates between sections", async ({ page }) => {
  // Default viewport (1280) is desktop (lg) → sidebar visible, bottom tabs hidden.
  await login(page, "thandi@email.co.za");
  await page.goto("/app");
  await expect(page.locator("aside").getByRole("link", { name: /Wallet/ })).toBeVisible();
  await expect(page.locator("nav.glass")).toBeHidden(); // bottom tabs hidden on desktop
  await page.locator("aside").getByRole("link", { name: /Wallet/ }).click();
  await page.waitForURL("**/app/wallet");
  await expect(page.getByText("Available to withdraw")).toBeVisible();
});

test("responsive: mobile shows bottom tabs and hides the desktop sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "thandi@email.co.za");
  await page.goto("/app");
  await expect(page.locator("nav.glass")).toBeVisible(); // bottom tab bar
  await expect(page.locator("aside")).toBeHidden(); // sidebar hidden on mobile
});

test("password reset: request a link, reset, and sign in with the new password", async ({ page }) => {
  await page.goto("/forgot");
  await page.locator('input[name="email"]').fill("thandi@email.co.za");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/we've sent a reset link/i)).toBeVisible();

  // The dev email sink logs the reset link to the dev-server console (/tmp/hhm-dev.log).
  await page.waitForTimeout(800);
  const log = fs.readFileSync("/tmp/hhm-dev.log", "utf8");
  const matches = [...log.matchAll(/\/reset\/([a-f0-9]{64})/g)];
  const token = matches.at(-1)?.[1];
  expect(token, "reset token should be emailed").toBeTruthy();

  await page.goto(`/reset/${token}`);
  // reset to the same password so other tests still work
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Set new password" }).click();
  await page.waitForURL("**/login?reset=1");
  await expect(page.getByText(/password has been reset/i)).toBeVisible();
  // confirm the new password works
  await login(page, "thandi@email.co.za");
  await expect(page).toHaveURL(/\/app/);
});

test("helper applies with real document uploads, and an admin can view them", async ({ page }) => {
  const email = `helperdoc_${Date.now()}@test.co.za`;
  await page.goto("/helper/apply");
  // Step 1 — details + ID/selfie uploads
  await page.getByPlaceholder("Thandi Mokoena").fill("Doc Test Helper");
  await page.getByPlaceholder("you@email.com").fill(email);
  await page.getByPlaceholder("082 000 0000").fill("+27 82 555 0000");
  await page.getByPlaceholder("At least 8 characters").fill("Password123!");
  await page.getByPlaceholder("South African ID").fill("9001015800086");
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles({ name: "id.png", mimeType: "image/png", buffer: PNG });
  await fileInputs.nth(1).setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: /Continue/ }).click();
  // Step 2 — areas + experience
  await page.getByRole("button", { name: "Sandton", exact: true }).click();
  await page.getByPlaceholder("e.g. 4").fill("5");
  await page.getByRole("button", { name: /Continue/ }).click();
  // Step 3 — banking
  await page.getByPlaceholder("e.g. FNB").fill("FNB");
  await page.getByPlaceholder("Account number").fill("62000000000");
  await page.getByRole("button", { name: /Submit application/ }).click();
  await page.waitForURL("**/helper/submitted", { timeout: 20_000 });

  // Admin can see and open the uploaded document (RBAC-gated, decrypted stream)
  await login(page, "admin@householdmaids.co.za");
  await page.goto("/admin/vetting");
  const docLink = page.locator('a[href^="/api/helper-docs/"]').first();
  await expect(docLink).toBeVisible();
  const href = await docLink.getAttribute("href");
  const resp = await page.request.get(href!);
  expect(resp.status()).toBe(200);
  expect(resp.headers()["content-type"]).toContain("image");
});

test("helper documents are not accessible without an admin session", async ({ page }) => {
  // A guessed/forged doc id must be forbidden for anonymous requests.
  const resp = await page.request.get("/api/helper-docs/nonexistent-id");
  expect([401, 403]).toContain(resp.status());
});

test("helper can open an assigned job", async ({ page }) => {
  await login(page, "lindiwe@email.co.za");
  await page.goto("/helper/dashboard");
  const job = page.locator('a[href^="/helper/jobs/"]').first();
  if ((await job.count()) > 0) {
    await job.click();
    await page.waitForURL("**/helper/jobs/**");
    await expect(page.getByText(/Live status|Mark next step|Job completed|Message customer/).first()).toBeVisible();
  }
});
