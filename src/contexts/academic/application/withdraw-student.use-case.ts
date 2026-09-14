import { NotFoundError } from "../../../shared/errors/app-error.js";
import * as studentsRepository from "../infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function withdrawStudent(userId: string, courseId: string, studentId: string) {
	await assertCourseOwnership(courseId, userId);

	const today = new Date().toISOString().split("T")[0];

	const updated = await studentsRepository.updateById(courseId, studentId, {
		active: false,
		withdrawalDate: today,
		updatedAt: new Date(),
	});

	if (!updated) {
		throw new NotFoundError("Estudiante no encontrado en este curso.");
	}

	return updated;
}
