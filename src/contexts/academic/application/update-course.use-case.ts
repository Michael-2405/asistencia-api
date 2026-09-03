import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ConflictError } from "../../../shared/errors/app-error.js";
import type { CreateCourseInput } from "../domain/create-course.schema.js";
import { courses } from "../infrastructure/db/schema.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function updateCourse(userId: string, courseId: string, input: CreateCourseInput) {
	await assertCourseOwnership(courseId, userId);

	try {
		const [updated] = await db
			.update(courses)
			.set({
				grade: input.grade,
				section: input.section,
				educationLevel: input.educationLevel,
				isHomeroom: input.isHomeroom,
				subjectId: input.subjectId ?? null,
				updatedAt: new Date(),
			})
			.where(eq(courses.id, courseId))
			.returning();

		return updated;
	} catch (error) {
		if (isPgUniqueViolation(error)) {
			throw new ConflictError("Ya tienes un curso registrado con esta sección y materia");
		}
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
