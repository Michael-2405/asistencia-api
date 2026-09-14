import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(import.meta.dirname, "./src") };

export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			{
				resolve: { alias },
				test: {
					name: "unit",
					include: ["tests/unit/**/*.test.ts"],
					// Algunos use-cases importan @/shared/config/env.js aunque el repositorio real
					// esté mockeado — env.ts valida process.env al cargar, así que necesita valores
					// dummy incluso cuando no hay DB/red real de por medio en un test unitario.
					env: {
						DATABASE_URL: "postgres://unit-test-unused/db",
						BETTER_AUTH_URL: "http://localhost:3000",
						RESEND_API_KEY: "unit-test-unused",
						CORS_ORIGIN: "http://localhost:5173",
						NODE_ENV: "test",
					},
				},
			},
			{
				resolve: { alias },
				test: {
					name: "integration",
					include: ["tests/integration/**/*.test.ts"],
					globalSetup: ["./tests/support/global-setup.ts"],
					setupFiles: ["./tests/support/mock-email.ts", "./tests/support/reset-db-hook.ts"],
					testTimeout: 30_000,
					hookTimeout: 60_000,
					fileParallelism: false,
				},
			},
			{
				resolve: { alias },
				test: {
					name: "e2e",
					include: ["tests/e2e/**/*.test.ts"],
					globalSetup: ["./tests/support/global-setup.ts"],
					setupFiles: ["./tests/support/mock-email.ts", "./tests/support/reset-db-hook.ts"],
					testTimeout: 30_000,
					hookTimeout: 60_000,
					fileParallelism: false,
				},
			},
		],
	},
});
