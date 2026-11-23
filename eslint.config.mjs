import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["prototypes/tender-desk/**/*.cjs"],
    // Passenger loads this standalone application through CommonJS.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    ".private/**",
    "next-env.d.ts",
    "prototypes/tender-desk/assets/lucide-0.468.0.min.js",
    "prototypes/tender-desk/assets/tender-details.bundle.js",
  ]),
]);
