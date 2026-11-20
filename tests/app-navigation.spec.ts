import { expect, test } from "@playwright/test";

test("Back after the OpenSEO link returns to the previous project page", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL(/\/p\/[^/]+\/?$/, { timeout: 30_000 });
  const dashboardUrl = page.url();

  await page.goto(`${dashboardUrl.replace(/\/$/, "")}/keywords`);
  const keywordsUrl = page.url();

  await page.getByRole("link", { name: "OpenSEO", exact: true }).click();
  await page.waitForURL(dashboardUrl);

  await page.goBack();
  await expect(page).toHaveURL(keywordsUrl);
});

test("a project can open Search Console and Site Audit with paid SEO off", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL(/\/p\/[^/]+\/?$/);
  const projectPath = new URL(page.url()).pathname.replace(/\/$/, "");
  await page.goto(`${projectPath}/backlinks`);
  const content = page.getByRole("main");
  const insights = content.getByRole("link", {
    name: "Search Console insights",
  });
  await expect(insights).toHaveAttribute(
    "href",
    `${projectPath}/search-performance`,
  );
  await insights.click();
  await expect(page).toHaveURL(new RegExp(projectPath + "/search-performance"));
  await page.goBack();
  await content.getByRole("link", { name: "Site Audit", exact: true }).click();
  await expect(page.locator("#audit-run-lighthouse")).toBeDisabled();
  await expect(
    content.getByRole("button", { name: "Start Audit" }),
  ).toBeVisible();
});
