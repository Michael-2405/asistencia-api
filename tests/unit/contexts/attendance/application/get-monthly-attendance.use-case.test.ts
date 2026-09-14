import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { getMonthlyAttendance } from "@/contexts/attendance/application/get-monthly-attendance.use-case.js";
import * as attendanceCalendarRepository from "@/contexts/attendance/infrastructure/db/attendance-calendar.repository.js";

vi.mock("@/contexts/attendance/infrastructure/db/attendance-calendar.repository.js", () => ({
	findCalendarDays: vi.fn(),
	findStudentMonthlyStatusRows: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

describe("getMonthlyAttendance", () => {
	beforeEach(() => {
		vi.mocked(attendanceCalendarRepository.findCalendarDays).mockReset();
		vi.mocked(attendanceCalendarRepository.findStudentMonthlyStatusRows).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({
			id: "course-1",
			schoolYearId: "sy-1",
		} as never);
	});

	it("arma el string del inicio de mes y transforma las filas a camelCase", async () => {
		vi.mocked(attendanceCalendarRepository.findCalendarDays).mockResolvedValue([
			{ date: "2027-03-01", non_instructional: false },
		] as never);
		vi.mocked(attendanceCalendarRepository.findStudentMonthlyStatusRows).mockResolvedValue([
			{
				student_id: "student-1",
				order_number: 1,
				first_name: "Ana",
				second_name: null,
				first_lastname: "Pérez",
				second_lastname: "Gómez",
				active: true,
				withdrawal_date: null,
				status_by_date: { "2027-03-01": "P" },
			},
		] as never);

		const result = await getMonthlyAttendance("user-1", "course-1", 2027, 3);

		expect(attendanceCalendarRepository.findCalendarDays).toHaveBeenCalledWith(
			"course-1",
			"sy-1",
			"2027-03-01",
		);
		expect(result.calendarDays).toEqual([{ date: "2027-03-01", nonInstructional: false }]);
		expect(result.rows[0]).toMatchObject({
			studentId: "student-1",
			rollNumber: 1,
			fullName: "Pérez Gómez, Ana",
			statusByDate: { "2027-03-01": "P" },
		});
	});
});
