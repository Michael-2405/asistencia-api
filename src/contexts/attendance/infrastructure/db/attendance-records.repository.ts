import { and, eq, inArray, sql } from "drizzle-orm";
import { students } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { attendanceRecords } from "./schema.js";

export function findExistingForCourseAndDate(courseId: string, date: string) {
	return db
		.select({ id: attendanceRecords.id })
		.from(attendanceRecords)
		.where(and(eq(attendanceRecords.courseId, courseId), eq(attendanceRecords.date, date)))
		.limit(1);
}

export async function insertMany(values: (typeof attendanceRecords.$inferInsert)[]) {
	await db.insert(attendanceRecords).values(values);
}

// Lee `academic.students` — elegibilidad de estudiantes retirados para el flujo de guardar asistencia.
export function findStudentsEligibility(courseId: string, studentIds: string[]) {
	return db
		.select({ id: students.id, active: students.active, withdrawalDate: students.withdrawalDate })
		.from(students)
		.where(and(eq(students.courseId, courseId), inArray(students.id, studentIds)));
}

export async function findTodayStatusByUser(userId: string) {
	const result = await db.execute(sql`
		SELECT
			c.id AS course_id,
			EXISTS(
				SELECT 1 FROM attendance.attendance_records a
				WHERE a.course_id = c.id AND a.date = CURRENT_DATE AND a.event_type = 'REGULAR'
			) AS submitted
		FROM academic.courses c
		WHERE c.user_id = ${userId} AND c.active = true
	`);
	return result.rows;
}
