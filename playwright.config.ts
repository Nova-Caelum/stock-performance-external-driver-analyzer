import { defineConfig } from "@playwright/test";

// Specs spawn their own servers (random free ports), so there is no webServer block.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
