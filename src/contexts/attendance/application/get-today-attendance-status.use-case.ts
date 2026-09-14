import * as attendanceRecordsRepository from "../infrastructure/db/attendance-records.repository.js";

export async function getTodayAttendanceStatus(userId: string) {
	const rows = await attendanceRecordsRepository.findTodayStatusByUser(userId);

	return rows.map((r) => ({
		courseId: r.course_id as string,
		submitted: r.submitted as boolean,
	}));
}
