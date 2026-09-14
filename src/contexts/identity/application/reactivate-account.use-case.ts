import type { IncomingHttpHeaders } from "node:http";
import { ValidationError } from "@/shared/errors/app-error.js";
import * as teacherProfileRepository from "../infrastructure/db/teacher-profile.repository.js";
import { verifyPassword } from "./verify-password.js";

export async function reactivateAccount(
	userId: string,
	password: string,
	headers: IncomingHttpHeaders,
) {
	const profile = await teacherProfileRepository.findByUserId(userId);

	if (!profile?.suspendedAt) {
		throw new ValidationError("Tu cuenta no está suspendida");
	}

	await verifyPassword(password, headers);

	await teacherProfileRepository.updateSuspension(userId, {
		suspendedAt: null,
		scheduledDeletionAt: null,
	});

	return { reactivated: true };
}
