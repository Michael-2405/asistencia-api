import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { env } from "../../../../shared/config/env.js";
import { db } from "../../../../shared/db/client.js";
import {
	sendPasswordResetEmail,
	sendVerificationEmail,
} from "../../../../shared/email/send-auth-email.js";
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
		sendResetPassword: async ({ user, url }) => {
			sendPasswordResetEmail(user.email, url);
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			sendVerificationEmail(user.email, url);
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
	},
	plugins: [twoFactor()],
});
