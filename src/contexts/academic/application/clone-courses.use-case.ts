import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import type { CloneCoursesInput } from "../domain/clone-courses.schema.js";
import { courses } from "../infrastructure/db/schema.js";
import { getCurrentSchoolYear } from "../utils/get-current-school-year.js";

export async function cloneCourses(userId: string, input: CloneCoursesInput) {
	const targetSchoolYear = await getCurrentSchoolYear();

	const sourceCourses = await db
		.select()
		.from(courses)
		.where(
			and(
				eq(courses.userId, userId),
				eq(courses.schoolYearId, input.sourceSchoolYearId),
				inArray(courses.id, input.courseIds),
			),
		);

	const created: (typeof courses.$inferSelect)[] = [];
	let skippedCount = 0;

	for (const source of sourceCourses) {
		try {
			const [course] = await db
				.insert(courses)
				.values({
					userId,
					schoolYearId: targetSchoolYear.id,
					grade: source.grade,
					section: source.section,
					educationLevel: source.educationLevel,
					isHomeroom: source.isHomeroom,
					subjectId: source.subjectId,
				})
				.returning();
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
