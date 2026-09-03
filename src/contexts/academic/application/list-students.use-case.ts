import { asc, eq } from "drizzle-orm";
import { db } from "../../../shared/db/client.js";
import { students } from "../infrastructure/db/schema.js";
import { assertCourseOwnership } from "./assert-course-ownership.js";

export async function listStudents(userId: string, courseId: string) {
	await assertCourseOwnership(courseId, userId);

	return db
		.select()
		.from(students)
		.where(eq(students.courseId, courseId))
		.orderBy(asc(students.orderNumber));
}
