import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROME_PATH
      ? {
          launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH },
        }
      : {}),
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  reporter: "list",
});
