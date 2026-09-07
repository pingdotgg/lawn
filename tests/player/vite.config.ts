import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  server: {
    host: "0.0.0.0",
    port: 5397,
    strictPort: true,
    allowedHosts: ["siva.otter-hawksbill.ts.net"],
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
  },
});
