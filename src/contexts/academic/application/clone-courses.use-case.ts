import type { CloneCoursesInput } from "../domain/clone-courses.schema.js";
import * as coursesRepository from "../infrastructure/db/courses.repository.js";
import type { courses } from "../infrastructure/db/schema.js";
import { getCurrentSchoolYear } from "../utils/get-current-school-year.js";

export async function cloneCourses(userId: string, input: CloneCoursesInput) {
	const targetSchoolYear = await getCurrentSchoolYear();

	const sourceCourses = await coursesRepository.findManyByUserYearAndIds(
		userId,
		input.sourceSchoolYearId,
		input.courseIds,
	);

	const created: (typeof courses.$inferSelect)[] = [];
	let skippedCount = 0;

	for (const source of sourceCourses) {
		try {
			const course = await coursesRepository.insert({
				userId,
				schoolYearId: targetSchoolYear.id,
				grade: source.grade,
				section: source.section,
				educationLevel: source.educationLevel,
				isHomeroom: source.isHomeroom,
				subjectId: source.subjectId,
			});
			created.push(course);
		} catch (error) {
			if (!isPgUniqueViolation(error)) throw error;
			skippedCount++;
		}
	}

	return { created, createdCount: created.length, skippedCount };
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
