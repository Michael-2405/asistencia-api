import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import type { MarkCourseNonInstructionalDayInput } from "../domain/mark-course-non-instructional-day.schema.js";
import * as courseNonInstructionalDaysRepository from "../infrastructure/db/course-non-instructional-days.repository.js";

export async function markCourseNonInstructionalDay(
	userId: string,
	courseId: string,
	input: MarkCourseNonInstructionalDayInput,
) {
	await assertCourseOwnership(courseId, userId);

	try {
		const day = await courseNonInstructionalDaysRepository.insert({
			courseId,
			date: input.date,
			reason: input.reason ?? null,
		});
		return day;
	} catch (error) {
		if (isPgUniqueViolation(error))
			throw new ConflictError("Ese día ya está marcado como no laborable para este curso");
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	const pgError = error instanceof Error && error.cause ? error.cause : error;
	return (
		typeof pgError === "object" && pgError !== null && "code" in pgError && pgError.code === "23505"
	);
}
