import { and, eq } from "drizzle-orm";
import { db } from "../../../shared/db/client.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { students } from "../infrastructure/db/schema.js";
import { assertCourseOwnership } from "./assert-course-ownership.js";

export async function withdrawStudent(userId: string, courseId: string, studentId: string) {
	await assertCourseOwnership(courseId, userId);

	const today = new Date().toISOString().split("T")[0];

	const [updated] = await db
		.update(students)
		.set({ active: false, withdrawalDate: today, updatedAt: new Date() })
		.where(and(eq(students.id, studentId), eq(students.courseId, courseId)))
		.returning();

	if (!updated) {
		throw new NotFoundError("Estudiante no encontrado en este curso.");
	}

	return updated;
}
