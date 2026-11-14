import { test, expect } from "@playwright/test";

// Smoke E2E skeletons — expand with authenticated fixtures, CSRF-aware flows, and seeded test data.
// Critical flows to cover: org login, register→onboard→dashboard, module gating, /platform RBAC, impersonate+return.

test("public pages load", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.*/);
});

test("platform login page loads", async ({ page }) => {
  await page.goto("/platform/login");
  await expect(page.getByText(/Platform/i)).toBeVisible();
});

test("register landing loads", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText(/Sign up|Register|Start/i)).toBeVisible();
});
