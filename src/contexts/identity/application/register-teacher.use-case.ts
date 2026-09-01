import { eq } from "drizzle-orm";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { user } from "@/contexts/identity/infrastructure/db/auth.schema.js";
import { teacherProfiles } from "@/contexts/identity/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import type { RegisterTeacherInput } from "./register-teacher.schema.js";

export async function registerTeacher(input: RegisterTeacherInput) {
	const result = await auth.api.signUpEmail({
		body: {
			email: input.email,
			password: input.password,
			name: input.fullName,
		},
	});

	if (!result?.user) {
		throw new Error("No se pudo crear la cuenta del docente");
	}

	try {
		await db.insert(teacherProfiles).values({
			userId: result.user.id,
			educationLevel: input.educationLevel,
			isHomeroomTeacher: input.isHomeroomTeacher,
			subjectId: input.subjectId ?? null,
		});
	} catch (error) {
		await db.delete(user).where(eq(user.id, result.user.id));
		throw error;
	}

	return { userId: result.user.id };
}
