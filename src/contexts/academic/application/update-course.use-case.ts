import { ConflictError } from "../../../shared/errors/app-error.js";
import type { CreateCourseInput } from "../domain/create-course.schema.js";
import * as coursesRepository from "../infrastructure/db/courses.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";
import { assertSubjectMatchesLevel } from "./assert-subject-matches-level.js";

export async function updateCourse(userId: string, courseId: string, input: CreateCourseInput) {
	await assertCourseOwnership(courseId, userId);

	if (input.subjectId) {
		await assertSubjectMatchesLevel(input.subjectId, input.educationLevel);
	}

	try {
		const updated = await coursesRepository.update(courseId, {
			grade: input.grade,
			section: input.section,
			educationLevel: input.educationLevel,
			isHomeroom: input.isHomeroom,
			subjectId: input.subjectId ?? null,
			updatedAt: new Date(),
		});

		return updated;
	} catch (error) {
		if (isPgUniqueViolation(error)) {
			throw new ConflictError("Ya tienes un curso registrado con esta sección y materia");
		}
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
