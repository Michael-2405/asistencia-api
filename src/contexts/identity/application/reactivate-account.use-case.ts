import type { IncomingHttpHeaders } from "node:http";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ValidationError } from "@/shared/errors/app-error.js";
import { teacherProfiles } from "../infrastructure/db/schema.js";
import { verifyPassword } from "./verify-password.js";

export async function reactivateAccount(
	userId: string,
	password: string,
	headers: IncomingHttpHeaders,
) {
	const [profile] = await db
		.select()
		.from(teacherProfiles)
		.where(eq(teacherProfiles.userId, userId));

	if (!profile?.suspendedAt) {
		throw new ValidationError("Tu cuenta no está suspendida");
	}

	await verifyPassword(password, headers);

	await db
		.update(teacherProfiles)
		.set({ suspendedAt: null, scheduledDeletionAt: null })
		.where(eq(teacherProfiles.userId, userId));

	return { reactivated: true };
}
