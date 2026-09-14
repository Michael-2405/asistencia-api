import * as coursesRepository from "../infrastructure/db/courses.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function deleteCourse(userId: string, courseId: string) {
	await assertCourseOwnership(courseId, userId);

	return coursesRepository.deactivate(courseId);
}
