import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

function detectSystemChromiumChannel(): "chrome" | "msedge" | undefined {
  if (process.env.CI) return undefined;
  if (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
    return "chrome";
  }
  if (
    existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe") ||
    existsSync("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")
  ) {
    return "msedge";
  }
  return undefined;
}

const E2E_PORT = process.env.PLAYWRIGHT_PORT ?? "3123";
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: detectSystemChromiumChannel(),
      },
    },
  ],
  webServer: {
    command: `pnpm start -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: Boolean(process.env.PLAYWRIGHT_REUSE_SERVER),
    timeout: 60_000,
  },
});
