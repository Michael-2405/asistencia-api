import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import { auth } from "../infrastructure/auth/auth.config.js";
import { teacherProfiles } from "../infrastructure/db/schema.js";
import { verifyPassword } from "./verify-password.js";

const GRACE_PERIOD_DAYS = 30;

export async function suspendAccount(
	userId: string,
	password: string,
	headers: IncomingHttpHeaders,
) {
	const [profile] = await db
		.select({ suspendedAt: teacherProfiles.suspendedAt })
		.from(teacherProfiles)
		.where(eq(teacherProfiles.userId, userId));

	if (profile?.suspendedAt) {
		throw new ConflictError("Tu cuenta ya está suspendida");
	}

	await verifyPassword(password, headers);

	const scheduledDeletionAt = new Date();
	scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + GRACE_PERIOD_DAYS);

	await db
		.update(teacherProfiles)
		.set({ suspendedAt: new Date(), scheduledDeletionAt })
		.where(eq(teacherProfiles.userId, userId));

	await auth.api.revokeSessions({ headers: fromNodeHeaders(headers) });

	return { scheduledDeletionAt };
}
