import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	PORT: z.coerce.number().default(3000),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	BETTER_AUTH_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
