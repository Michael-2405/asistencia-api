import { and, eq, inArray, type SQL, sql } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { courses, students, subjects } from "./schema.js";

export async function findByIdAndUserId(courseId: string, userId: string) {
	const [course] = await db
		.select()
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
	return course;
}

export function findManyWithStudentCounts(userId: string, schoolYearId?: string) {
	const conditions: SQL[] = [eq(courses.userId, userId), eq(courses.active, true)];
	if (schoolYearId) conditions.push(eq(courses.schoolYearId, schoolYearId));

	return db
		.select({
			id: courses.id,
			schoolYearId: courses.schoolYearId,
			grade: courses.grade,
			section: courses.section,
			educationLevel: courses.educationLevel,
			isHomeroom: courses.isHomeroom,
			subjectId: courses.subjectId,
			subjectName: subjects.name,
			active: courses.active,
			activeStudentCount: sql<number>`count(*) filter (where ${students.active} = true)`.mapWith(
				Number,
			),
			inactiveStudentCount: sql<number>`count(*) filter (where ${students.active} = false)`.mapWith(
				Number,
			),
		})
		.from(courses)
		.leftJoin(students, eq(students.courseId, courses.id))
		.leftJoin(subjects, eq(courses.subjectId, subjects.id))
		.where(and(...conditions))
		.groupBy(courses.id, subjects.name);
}

export function findManyByUserYearAndIds(
	userId: string,
	schoolYearId: string,
	courseIds: string[],
) {
	return db
		.select()
		.from(courses)
		.where(
			and(
				eq(courses.userId, userId),
				eq(courses.schoolYearId, schoolYearId),
				inArray(courses.id, courseIds),
			),
		);
}

export async function insert(values: typeof courses.$inferInsert) {
	const [course] = await db.insert(courses).values(values).returning();
	return course;
}

export async function update(courseId: string, values: Partial<typeof courses.$inferInsert>) {
	const [updated] = await db
		.update(courses)
		.set(values)
		.where(eq(courses.id, courseId))
		.returning();
	return updated;
}

export async function deactivate(courseId: string) {
	const [updated] = await db
		.update(courses)
		.set({ active: false, updatedAt: new Date() })
		.where(eq(courses.id, courseId))
		.returning();
	return updated;
}
