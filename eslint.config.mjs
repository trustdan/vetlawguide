import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "corpus/**",
      "playwright-report/**",
      "test-results/**",
      "work/**",
    ],
  },
];

export default eslintConfig;
