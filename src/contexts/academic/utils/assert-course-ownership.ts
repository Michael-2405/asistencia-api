import { NotFoundError } from "../../../shared/errors/app-error.js";
import * as coursesRepository from "../infrastructure/db/courses.repository.js";

export async function assertCourseOwnership(courseId: string, userId: string) {
	const course = await coursesRepository.findByIdAndUserId(courseId, userId);

	if (!course) {
		throw new NotFoundError("Curso no encontrado");
	}

	return course;
}
