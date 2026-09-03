import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { teacherProfiles } from "@/contexts/identity/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { AccountSuspendedError } from "../errors/app-error.js";

export async function checkNotSuspended(req: Request, _res: Response, next: NextFunction) {
	const [profile] = await db
		.select({
			suspendedAt: teacherProfiles.suspendedAt,
			scheduledDeletionAt: teacherProfiles.scheduledDeletionAt,
		})
		.from(teacherProfiles)
		.where(eq(teacherProfiles.userId, req.userId));

	if (profile?.suspendedAt) {
		return next(
			new AccountSuspendedError("Tu cuenta está suspendida", {
				scheduledDeletionAt: profile.scheduledDeletionAt,
			}),
		);
	}

	next();
}
