import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { students } from "./schema.js";

export async function findLastOrderNumber(courseId: string) {
	const [lastStudent] = await db
		.select({ orderNumber: students.orderNumber })
		.from(students)
		.where(eq(students.courseId, courseId))
		.orderBy(desc(students.orderNumber))
		.limit(1);

	return lastStudent?.orderNumber;
}

export async function insert(values: typeof students.$inferInsert) {
	const [student] = await db.insert(students).values(values).returning();
	return student;
}

export function findManyByCourseId(courseId: string) {
	return db
		.select()
		.from(students)
		.where(eq(students.courseId, courseId))
		.orderBy(asc(students.orderNumber));
}

export async function updateById(
	courseId: string,
	studentId: string,
	values: Partial<typeof students.$inferInsert>,
) {
	const [updated] = await db
		.update(students)
		.set(values)
		.where(and(eq(students.id, studentId), eq(students.courseId, courseId)))
		.returning();
	return updated;
}
