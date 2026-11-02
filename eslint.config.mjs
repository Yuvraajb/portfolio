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
  ]),
  {
    // Content sync scripts are plain CommonJS run by `node`, not app code —
    // the TypeScript/ESM rules don't apply to them.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Vendored verbatim from the React Bits registry. Kept byte-for-byte as
    // shipped so re-running `shadcn add` never conflicts — which means their
    // ref-during-render and dep-array patterns have to be tolerated here.
    files: [
      "components/GradientASCII.jsx",
      "components/DecryptedText.tsx",
      "components/BlurText.tsx",
      "components/RotatingText.tsx",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
