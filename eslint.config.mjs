import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "lib/**/*",
      ".next/**/*",
      "out/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "playwright-report/**/*",
      ".playwright/**/*",
      "build/**/*",
      "dist/**/*",
      "*.config.js",
      "*.config.ts",
      "next-env.d.ts", // Next.js generated file
    ],
  },
  {
    rules: {
      // Allow 'any' type but warn about it (common when dealing with external APIs)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars that start with underscore (common pattern for intentionally unused)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Display name warnings are less critical
      "react/display-name": "warn",
    },
  },
];

export default eslintConfig;
