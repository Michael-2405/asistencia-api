import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../../../shared/db/client.js";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schemaName: "auth",
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
});
