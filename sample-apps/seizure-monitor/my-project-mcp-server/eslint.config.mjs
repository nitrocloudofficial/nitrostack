import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // backend/ is a separate Node project (own package.json, tsconfig,
    // and `npm run lint` via tsc) — not part of this Next.js app.
    "backend/**",
    // frontend/ and src/ belong to a teammate's separate NitroStack MCP
    // implementation (own package.json/tsconfig, own node_modules) —
    // not wired into this root project.
    "frontend/**",
    "src/**",
    // teammate's NitroStack "Pizzaz" template project — own package.json/tsconfig.
    "my_project_hackathon/**",
  ]),
]);

export default eslintConfig;
