import { ConflictError } from "../../../shared/errors/app-error.js";
import type { CreateCourseInput } from "../domain/create-course.schema.js";
import * as coursesRepository from "../infrastructure/db/courses.repository.js";
import { getCurrentSchoolYear } from "../utils/get-current-school-year.js";
import { assertSubjectMatchesLevel } from "./assert-subject-matches-level.js";

export async function createCourse(userId: string, input: CreateCourseInput) {
	const schoolYear = await getCurrentSchoolYear();

	if (input.subjectId) {
		await assertSubjectMatchesLevel(input.subjectId, input.educationLevel);
	}

	try {
		const course = await coursesRepository.insert({
			userId,
			schoolYearId: schoolYear.id,
			grade: input.grade,
			section: input.section,
			educationLevel: input.educationLevel,
			isHomeroom: input.isHomeroom,
			subjectId: input.subjectId ?? null,
		});

		return course;
	} catch (error) {
		if (isPgUniqueViolation(error)) {
			throw new ConflictError("Ya tienes un curso registrado con esta seccion y materia");
		}
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
