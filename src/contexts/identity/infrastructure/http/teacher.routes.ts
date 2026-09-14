import { Router } from "express";
import { registrationRateLimit } from "@/shared/middleware/rate-limit.middleware.js";
import { requireAuth } from "@/shared/middleware/require-auth.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { reactivateAccountSchema } from "../../domain/reactivate-account.schema.js";
import { registerTeacherSchema } from "../../domain/register-teacher.schema.js";
import { suspendAccountSchema } from "../../domain/suspend-account.schema.js";
import * as teacherProfileController from "./teacher-profile.controller.js";

export const teacherRouter = Router();

teacherRouter.post(
	"/register",
	registrationRateLimit,
	validate(registerTeacherSchema),
	teacherProfileController.registerTeacher,
);

teacherRouter.use(requireAuth);

teacherRouter.get("/me", teacherProfileController.getMyProfile);

teacherRouter.post(
	"/me/suspend",
	validate(suspendAccountSchema),
	teacherProfileController.suspendAccount,
);

teacherRouter.post(
	"/me/reactivate",
	validate(reactivateAccountSchema),
	teacherProfileController.reactivateAccount,
);
