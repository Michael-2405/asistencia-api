import { assertSubjectMatchesLevel } from "@/contexts/academic/application/assert-subject-matches-level.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { env } from "@/shared/config/env.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import type { RegisterTeacherInput } from "../domain/register-teacher.schema.js";
import * as authUserRepository from "../infrastructure/db/auth-user.repository.js";
import * as teacherProfileRepository from "../infrastructure/db/teacher-profile.repository.js";

export async function registerTeacher(input: RegisterTeacherInput) {
	const existingUser = await authUserRepository.findByEmail(input.email);

	if (existingUser) {
		throw new ConflictError("Ya existe una cuenta registrada con ese correo");
	}

	if (input.subjectId) {
		await assertSubjectMatchesLevel(input.subjectId, input.educationLevel);
	}

	const signUpResult = await auth.api.signUpEmail({
		body: {
			email: input.email,
			password: input.password,
			name: input.fullName,
			callbackURL: `${env.CORS_ORIGIN}/login`,
		},
	});

	if (!signUpResult?.user) {
		throw new Error("No se pudo crear la cuenta del docente");
	}

	try {
		await teacherProfileRepository.insert({
			userId: signUpResult.user.id,
			educationLevel: input.educationLevel,
			isHomeroomTeacher: input.isHomeroomTeacher,
			subjectId: input.subjectId ?? null,
		});
	} catch (error) {
		await authUserRepository.deleteById(signUpResult.user.id);

		if (isPgUniqueViolation(error)) {
			throw new ConflictError("Ya existe un docente registrado con esa cédula");
		}
		throw error;
	}

	return { userId: signUpResult.user.id };
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
