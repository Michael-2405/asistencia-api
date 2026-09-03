import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ConflictError, ValidationError } from "@/shared/errors/app-error.js";
import { auth } from "../infrastructure/auth/auth.config.js";
import { user } from "../infrastructure/db/auth.schema.js";
import { teacherProfiles } from "../infrastructure/db/schema.js";

const GRACE_PERIOD_DAYS = 30;

export async function suspendAccount(
	userId: string,
	password: string,
	headers: IncomingHttpHeaders,
) {
	const [row] = await db
		.select({ email: user.email, suspendedAt: teacherProfiles.suspendedAt })
		.from(teacherProfiles)
		.innerJoin(user, eq(user.id, teacherProfiles.userId))
		.where(eq(teacherProfiles.userId, userId));

	if (row?.suspendedAt) {
		throw new ConflictError("Tu cuenta ya está suspendida");
	}

	try {
		await auth.api.signInEmail({ body: { email: row.email, password } });
	} catch {
		throw new ValidationError("Contraseña incorrecta");
	}

	const scheduledDeletionAt = new Date();
	scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + GRACE_PERIOD_DAYS);

	await db
		.update(teacherProfiles)
		.set({ suspendedAt: new Date(), scheduledDeletionAt })
		.where(eq(teacherProfiles.userId, userId));

	await auth.api.revokeSessions({ headers: fromNodeHeaders(headers) });

	return { scheduledDeletionAt };
}
