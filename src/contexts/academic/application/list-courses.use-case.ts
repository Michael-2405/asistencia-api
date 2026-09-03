import { and, eq, type SQL, sql } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { courses, students, subjects } from "../infrastructure/db/schema.js";

export async function listCourses(userId: string, schoolYearId?: string) {
	const conditions: SQL[] = [eq(courses.userId, userId)];
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
