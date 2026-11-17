import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    ".private/**",
    "next-env.d.ts",
    "prototypes/tender-desk/assets/lucide-0.468.0.min.js",
  ]),
]);
