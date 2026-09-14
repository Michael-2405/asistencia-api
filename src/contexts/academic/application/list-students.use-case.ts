import * as studentsRepository from "../infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function listStudents(userId: string, courseId: string) {
	await assertCourseOwnership(courseId, userId);

	return studentsRepository.findManyByCourseId(courseId);
}
