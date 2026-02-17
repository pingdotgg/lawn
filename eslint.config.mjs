import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: [
    "node_modules/**",
    ".next/**",
    "build/**",
    "dist/**",
    "app/routeTree.gen.ts",
    "convex/_generated/**",
    "coverage/**",
  ],
  rules: {
    "no-undef": "off",
    "@typescript-eslint/no-empty-object-type": "off",
  },
});
