import path from "node:path";
import { defineConfig } from "vitest/config";

// Pruebas unitarias (sin red ni Supabase): validación de las Server Actions, permisos por rol,
// redirecciones y cabeceras. Las de integración (RLS, Storage, E2E) viven en ../tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // "server-only" lanza fuera de un Server Component; en las pruebas no hace falta.
      "server-only": path.resolve(__dirname, "tests/unit/stubs/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
