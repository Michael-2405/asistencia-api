import { and, eq } from "drizzle-orm";
import { db } from "../../../shared/db/client.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { AddStudentInput } from "../domain/add-student.schema.js";
import { students } from "../infrastructure/db/schema.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function updateStudent(
	userId: string,
	courseId: string,
	studentId: string,
	input: AddStudentInput,
) {
	await assertCourseOwnership(courseId, userId);

	const [updated] = await db
		.update(students)
		.set({
			firstName: input.firstName,
			secondName: input.secondName,
			firstLastname: input.firstLastname,
			secondLastname: input.secondLastname,
			birthDate: input.birthDate,
			sex: input.sex,
			updatedAt: new Date(),
		})
		.where(and(eq(students.id, studentId), eq(students.courseId, courseId)))
		.returning();

	if (!updated) {
		throw new NotFoundError("Estudiante no encontrado en este curso");
	}

	return updated;
}
