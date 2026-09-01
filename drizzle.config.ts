import { defineConfig } from "drizzle-kit";
import { env } from "./src/shared/config/env.js";

export default defineConfig({
	schema: [
		"./src/contexts/identity/infrastructure/db/auth.schema.ts",
		"./src/contexts/identity/infrastructure/db/schema.ts",
		"./src/contexts/academic/infrastructure/db/schema.ts",
		"./src/contexts/attendance/infrastructure/db/schema.ts",
	],
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
