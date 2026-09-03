import { courseNonInstructionalDays } from "@/contexts/academic/infrastructure/db/schema.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { db } from "@/shared/db/client.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import type { MarkCourseNonInstructionalDayInput } from "../domain/mark-course-non-instructional-day.schema.js";

export async function markCourseNonInstructionalDay(
	userId: string,
	courseId: string,
	input: MarkCourseNonInstructionalDayInput,
) {
	await assertCourseOwnership(courseId, userId);

	try {
		const [day] = await db
			.insert(courseNonInstructionalDays)
			.values({ courseId, date: input.date, reason: input.reason ?? null })
			.returning();
		return day;
	} catch (error) {
		if (isPgUniqueViolation(error))
			throw new ConflictError("Ese día ya está marcado como no laborable para este curso");
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
