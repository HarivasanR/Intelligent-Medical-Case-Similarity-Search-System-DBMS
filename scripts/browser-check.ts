import "./env";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";

async function main() {
  // Edge is installed on Windows; omit BROWSER_CHANNEL to use Playwright Chromium elsewhere.
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  let fixtureURL: string | undefined;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  fs.mkdirSync("docs/screenshots", { recursive: true });
  async function capture(name: string) { await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true }); }
  try {
    await page.goto(`${base}/login`);
    await expect(page.getByRole("heading", { name: "Sign in to MedMatch" })).toBeVisible();
    await capture("01-login");
    await page.getByLabel("Email address").fill("admin@medmatch.test");
    await page.getByLabel("Password", { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard"); await expect(page.getByText("Total cases", { exact: true })).toBeVisible();
    await capture("02-dashboard");
    await page.goto(`${base}/cases`);
    await expect(page.locator("tbody tr").first()).toBeVisible(); await capture("03-library");
    await page.goto(`${base}/cases/new`);
    await expect(page.getByLabel("Symptoms", { exact: true })).toBeVisible(); await capture("04-new-case");
    // Exercise the real form -> API -> three databases -> detail page, rather than only API calls.
    await page.getByLabel("Additional notes").fill("Synthetic browser test fixture");
    await page.getByRole("button", { name: "Save and index case" }).click();
    await page.waitForURL(/\/cases\/\d+$/);
    await expect(page.getByText("Synthetic browser test fixture", { exact: true })).toBeVisible();
    const detailURL = page.url(); fixtureURL = detailURL;
    await capture("05-case-detail");
    await page.getByRole("link", { name: "Edit case", exact: true }).click();
    await page.getByLabel("Additional notes").fill("Updated synthetic browser fixture");
    await capture("06-edit-case");
    await page.getByRole("button", { name: "Save and index case" }).click();
    await page.waitForURL(detailURL);
    await expect(page.getByText("Updated synthetic browser fixture", { exact: true })).toBeVisible();
    await page.goto(`${base}/search`);
    const searched = page.waitForResponse(r => r.url().endsWith("/api/search/similar") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Search similar cases" }).click();
    const searchResponse = await searched; expect(searchResponse.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Ranked results" })).toBeVisible(); await capture("07-search");
    await page.goto(`${base}/history`);
    await expect(page.getByRole("button", { name: "Delete entry" }).first()).toBeVisible(); await capture("08-history");
    await page.getByRole("button", { name: "Delete entry" }).first().click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByText("Confirm deletion?")).toHaveCount(0);
    await page.goto(`${base}/admin`);
    await expect(page.getByText("Pending case synchronization: 0")).toBeVisible(); await capture("09-admin");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(detailURL);
    await expect(page.getByRole("button", { name: "Delete case", exact: true })).toBeVisible();
    await capture("10-mobile-case");
    await page.getByRole("button", { name: "Delete case", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click(); await page.waitForURL(`${base}/cases`);
    fixtureURL = undefined;
    expect(errors).toEqual([]);
    fs.writeFileSync("docs/browser-results.md", `# Browser verification\n\nRecorded ${new Date().toISOString()}. Playwright with ${browser.browserType().name()} (${process.platform === "win32" ? "Edge channel" : "bundled Chromium"}), actual database mode.\n\n- PASS: login form and protected dashboard\n- PASS: case library and create form\n- PASS: create, edit, and delete a synthetic case through the UI\n- PASS: vector search and ranked results\n- PASS: personal history deletion\n- PASS: Admin service/synchronization view\n- PASS: mobile case detail and deletion controls\n- PASS: no browser page errors\n\nScreenshots are in [screenshots/](screenshots/). Credentials were never included in screenshots.\n`);
    console.log("Browser flows passed; ten screenshots and browser-results.md saved.");
  } finally {
    if (fixtureURL) {
      const id = fixtureURL.split("/").pop();
      await context.request.delete(`${base}/api/cases/${id}`).catch(() => {});
    }
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exit(1); });
