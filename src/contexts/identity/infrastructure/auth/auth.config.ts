import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../../../../shared/config/env.js";
import { db } from "../../../../shared/db/client.js";
import * as authSchema from "../db/auth.schema.js";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schemaName: "auth",
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
});
