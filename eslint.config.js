/**
 * ESLint (configuración plana de Expo). Se corre con `npx expo lint` o `npm run lint`.
 * Se ignoran los tipos generados desde el OpenAPI (`src/api/esquema.ts`) y la salida de `expo export`.
 */
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "src/api/esquema.ts"],
  },
]);
