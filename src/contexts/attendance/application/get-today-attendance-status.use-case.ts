import { sql } from "drizzle-orm";
import { db } from "@/shared/db/client.js";

export async function getTodayAttendanceStatus(userId: string) {
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

	return result.rows.map((r) => ({
		courseId: r.course_id as string,
		submitted: r.submitted as boolean,
	}));
}
