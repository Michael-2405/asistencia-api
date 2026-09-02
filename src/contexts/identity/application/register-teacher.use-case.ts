import { eq } from "drizzle-orm";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { user } from "@/contexts/identity/infrastructure/db/auth.schema.js";
import { teacherProfiles } from "@/contexts/identity/infrastructure/db/schema.js";
import { env } from "@/shared/config/env.js";
import { db } from "@/shared/db/client.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import type { RegisterTeacherInput } from "./register-teacher.schema.js";

export async function registerTeacher(input: RegisterTeacherInput) {
	const [existingUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, input.email));

	if (existingUser) {
		throw new ConflictError("Ya existe una cuenta registrada con ese correo");
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
		await db.insert(teacherProfiles).values({
			userId: signUpResult.user.id,
			educationLevel: input.educationLevel,
			isHomeroomTeacher: input.isHomeroomTeacher,
			subjectId: input.subjectId ?? null,
		});
	} catch (error) {
		await db.delete(user).where(eq(user.id, signUpResult.user.id));

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
