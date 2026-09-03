import { and, eq } from "drizzle-orm";
import { db } from "../../../shared/db/client.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { courses } from "../infrastructure/db/schema.js";

export async function assertCourseOwnership(courseId: string, userId: string) {
	const [course] = await db
		.select()
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.userId, userId)));

	if (!course) {
		throw new NotFoundError("Curso no encontrado");
	}

	return course;
}
