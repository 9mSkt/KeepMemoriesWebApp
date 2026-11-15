import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// Runs against `next dev` in local dev mode (JSON-file DB + fake Google Photos), so no credentials are needed.
// Make sure .env.local doesn't set SUPABASE_*/GOOGLE_* when running this, or it will use the real services.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera"],
        launchOptions: {
          // Chromium's fake camera gives the viewfinder a live test pattern.
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
    { name: "iphone-14", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
