import type { NextFunction, Request, Response } from "express";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { AccountSuspendedError } from "../errors/app-error.js";

export async function checkNotSuspended(req: Request, _res: Response, next: NextFunction) {
	const profile = await teacherProfileRepository.findByUserId(req.userId);

	if (profile?.suspendedAt) {
		return next(
			new AccountSuspendedError("Tu cuenta está suspendida", {
				scheduledDeletionAt: profile.scheduledDeletionAt,
			}),
		);
	}

	next();
}
