import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { ConflictError } from "@/shared/errors/app-error.js";
import { auth } from "../infrastructure/auth/auth.config.js";
import * as teacherProfileRepository from "../infrastructure/db/teacher-profile.repository.js";
import { verifyPassword } from "./verify-password.js";

const GRACE_PERIOD_DAYS = 30;

export async function suspendAccount(
	userId: string,
	password: string,
	headers: IncomingHttpHeaders,
) {
	const profile = await teacherProfileRepository.findByUserId(userId);

	if (profile?.suspendedAt) {
		throw new ConflictError("Tu cuenta ya está suspendida");
	}

	await verifyPassword(password, headers);

	const scheduledDeletionAt = new Date();
	scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + GRACE_PERIOD_DAYS);

	await teacherProfileRepository.updateSuspension(userId, {
		suspendedAt: new Date(),
		scheduledDeletionAt,
	});

	await auth.api.revokeSessions({ headers: fromNodeHeaders(headers) });

	return { scheduledDeletionAt };
}
