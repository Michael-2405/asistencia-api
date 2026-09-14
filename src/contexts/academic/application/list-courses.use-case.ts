import * as coursesRepository from "../infrastructure/db/courses.repository.js";

export function listCourses(userId: string, schoolYearId?: string) {
	return coursesRepository.findManyWithStudentCounts(userId, schoolYearId);
}
