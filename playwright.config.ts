import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/player",
  testMatch: "*.pw.ts",
  use: { baseURL: "http://localhost:5397", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "bunx vite --config tests/player/vite.config.ts",
    url: "http://localhost:5397",
    reuseExistingServer: !process.env.CI,
  },
});
