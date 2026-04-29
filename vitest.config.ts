import { defineConfig, defineProject } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const aliases = { "@": resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      defineProject({
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: [],
        },
        resolve: { alias: aliases },
      }),
      defineProject({
        test: {
          name: "rls",
          environment: "node",
          globals: true,
          include: ["tests/rls/**/*.test.ts"],
          setupFiles: ["tests/rls/setup.ts"],
          fileParallelism: false,
        },
        resolve: { alias: aliases },
      }),
    ],
  },
});
