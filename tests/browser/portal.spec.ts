import { test, expect } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const backendConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
test("login and preview remain explicitly separate", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  const signIn = page.getByRole("button", { name: "Secure sign in" });
  if (backendConfigured) await expect(signIn).toBeEnabled();
  else await expect(signIn).toBeDisabled();
  await page.getByRole("link", { name: "Student preview" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back, Nirdesh/ }),
  ).toBeVisible();
  await expect(page.locator(".preview-banner")).toContainText("Sample data");
});
test("student library filters, searches and switches views", async ({
  page,
}) => {
  await page.goto("/preview/student/documents");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Upload document", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search documents" })
    .fill("Semester 4");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Grid view" }).click();
  await expect(page.locator(".document-grid-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Semester 4 Marksheet" }).click();
  await expect(
    page.getByRole("heading", { name: "Document information" }),
  ).toBeVisible();
});
test("staff revocation dialog requires an audit reason", async ({ page }) => {
  await page.goto("/preview/staff/documents/preview-1");
  await page
    .getByRole("button", { name: "Revoke document", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm revocation" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: /Lifecycle remarks/ })
    .fill("Superseded university document.");
  await expect(
    page.getByRole("button", { name: "Confirm revocation" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm revocation" }).click();
  await expect(
    page.getByText("This is a design preview.", { exact: false }),
  ).toBeVisible();
});
test("staff directory preselects recipient and scopes for issuance", async ({
  page,
}) => {
  await page.goto("/preview/staff/students");
  await page.getByRole("textbox", { name: "Search students" }).fill("Nirdesh");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Issue document", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Issue a document" }),
  ).toBeVisible();
  await expect(page.getByLabel("Assign to student")).toHaveValue(
    "11111111-1111-4111-8111-111111111111",
  );
  await expect(page.getByLabel("Issuance scope")).toHaveValue(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );
});
test("staff inventory filters all four lifecycle states", async ({ page }) => {
  await page.goto("/preview/staff/documents");
  for (const [status, count] of [
    ["Draft", 1],
    ["Issued", 5],
    ["Archived", 1],
    ["Revoked", 1],
  ] as const) {
    await page
      .getByRole("button", { name: `${status} ${count}`, exact: true })
      .click();
    await expect(page.locator("tbody tr")).toHaveCount(count);
  }
});
test("obsolete student upload route and Staff review route are removed", async ({
  page,
}) => {
  for (const route of ["/preview/student/upload", "/preview/staff/review"]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "A little off campus." }),
    ).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
  }
});
test("private routes redirect and APIs require an authenticated session", async ({
  page,
  request,
}) => {
  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/staff/issue");
  await expect(page).toHaveURL(/\/login$/);
  const exportResponse = await request.get("/api/exports?kind=documents");
  expect(exportResponse.status()).toBe(backendConfigured ? 401 : 503);
  const access = await request.get(
    "/api/documents/11111111-1111-4111-8111-111111111111/access?kind=preview",
  );
  expect(access.status()).toBe(backendConfigured ? 401 : 503);
  const mutation = await request.post("/api/profile", {
    data: { role: "staff" },
  });
  expect(mutation.status()).toBe(405);
});
for (const width of [390, 768, 1024, 1440])
  test(`responsive dashboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/preview/student/dashboard");
    await expect(
      page.getByRole("heading", { name: /Welcome back, Nirdesh/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page.getByRole("link", { name: "My documents", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "My documents", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "My documents", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
  });
test("all preview pages render without runtime errors or overall overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/unauthorized",
    "/preview/staff/issue",
    "/preview/staff/students",
    "/preview/student/activity",
    "/preview/student/profile",
    "/preview/staff/dashboard",
    "/preview/staff/documents",
    "/preview/staff/exports",
    "/preview/staff/activity",
    "/preview/staff/profile",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
