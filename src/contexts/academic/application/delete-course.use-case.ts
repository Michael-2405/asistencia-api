import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { courses } from "../infrastructure/db/schema.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function deleteCourse(userId: string, courseId: string) {
	await assertCourseOwnership(courseId, userId);

	const [updated] = await db
		.update(courses)
		.set({ active: false, updatedAt: new Date() })
		.where(eq(courses.id, courseId))
		.returning();

	return updated;
}
