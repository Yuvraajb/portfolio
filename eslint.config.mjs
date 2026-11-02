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
    // Scoped by naming convention, not a blanket glob: vendored files are
    // PascalCase (as the registry ships them), authored ones are kebab-case.
    // A broad `components/*` would silence these rules for our own code too.
    files: [
      "components/AnimatedContent.tsx",
      "components/BlurText.tsx",
      "components/CountUp.tsx",
      "components/DecryptedText.tsx",
      "components/GradientASCII.jsx",
      "components/LogoLoop.tsx",
      "components/MetaBalls.tsx",
      "components/Orb.tsx",
      "components/RotatingText.tsx",
      "components/SpotlightCard.tsx",
      "components/StarBorder.tsx",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "prefer-const": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
