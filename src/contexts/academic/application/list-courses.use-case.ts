import { and, count, eq, type SQL } from "drizzle-orm";
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
			activeStudentCount: count(students.id),
		})
		.from(courses)
		.leftJoin(students, and(eq(students.courseId, courses.id), eq(students.active, true)))
		.leftJoin(subjects, eq(courses.subjectId, subjects.id))
		.where(and(...conditions))
		.groupBy(courses.id, subjects.name);
}
