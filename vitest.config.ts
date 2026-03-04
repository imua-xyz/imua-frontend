import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    exclude: [
      "node_modules",
      ".next",
      "lib/forge-std",
      "lib/imua-contracts",
      "**/__tests__/setup.ts",
    ],
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      include: [
        "hooks/**/*.ts",
        "lib/**/*.ts",
        "stores/**/*.ts",
        "types/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
        "lib/forge-std/**",
        "lib/imua-contracts/**",
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
