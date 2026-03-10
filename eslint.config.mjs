import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// eslint-config-next (Next.js 16) exports flat config array
const nextConfig = require("eslint-config-next/core-web-vitals");

export default [
  {
    ignores: [".next/**", "node_modules/**", "*.config.js", "*.config.mjs", "*.config.ts"],
  },
  ...nextConfig,
];
