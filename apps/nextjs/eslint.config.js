import baseConfig, { restrictEnvAccess } from "@snowball/eslint-config/base";
import nextjsConfig from "@snowball/eslint-config/nextjs";
import reactConfig from "@snowball/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
