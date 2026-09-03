import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./artifacts/canonical-baseline/19.0.0",
  dialect: "postgresql",
  strict: true,
  verbose: true,
});
