import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { getAnnualAttendanceSummary } from "@/contexts/attendance/application/get-annual-attendance-summary.use-case.js";
import * as attendanceCalendarRepository from "@/contexts/attendance/infrastructure/db/attendance-calendar.repository.js";

vi.mock("@/contexts/attendance/infrastructure/db/attendance-calendar.repository.js", () => ({
	findSchoolYearDateRange: vi.fn(),
	findAnnualSummaryRows: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

describe("getAnnualAttendanceSummary", () => {
	beforeEach(() => {
		vi.mocked(attendanceCalendarRepository.findSchoolYearDateRange).mockReset();
		vi.mocked(attendanceCalendarRepository.findAnnualSummaryRows).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({
			id: "course-1",
			schoolYearId: "sy-1",
		} as never);
		vi.mocked(attendanceCalendarRepository.findSchoolYearDateRange).mockResolvedValue({
			start_date: "2027-08-01",
			end_date: "2028-06-30",
		} as never);
	});

	it("agrupa filas mensuales por estudiante y calcula totales y porcentajes", async () => {
		vi.mocked(attendanceCalendarRepository.findAnnualSummaryRows).mockResolvedValue([
			{
				student_id: "s1",
				order_number: 1,
				first_name: "Ana",
				second_name: null,
				first_lastname: "Pérez",
				second_lastname: null,
				active: true,
				month: "2027-08-01",
				p: "8",
				t: "1",
				a: "1",
				e: "0",
			},
			{
				student_id: "s1",
				order_number: 1,
				first_name: "Ana",
				second_name: null,
				first_lastname: "Pérez",
				second_lastname: null,
				active: true,
				month: "2027-09-01",
				p: "10",
				t: "0",
				a: "0",
				e: "0",
			},
		] as never);

		const [summary] = await getAnnualAttendanceSummary("user-1", "course-1");

		expect(summary.studentId).toBe("s1");
		expect(summary.months).toHaveLength(2);
		expect(summary.totals).toEqual({ p: 18, t: 1, a: 1, e: 0 });
		expect(summary.totalDays).toBe(20);
		expect(summary.attendancePct).toBe(95);
		expect(summary.absencePct).toBe(5);
	});

	it("devuelve 100% de asistencia y 0% de ausencia cuando no hay días registrados", async () => {
		vi.mocked(attendanceCalendarRepository.findAnnualSummaryRows).mockResolvedValue([
			{
				student_id: "s1",
				order_number: 1,
				first_name: "Ana",
				second_name: null,
				first_lastname: "Pérez",
				second_lastname: null,
				active: true,
				month: "2027-08-01",
				p: "0",
				t: "0",
				a: "0",
				e: "0",
			},
		] as never);

		const [summary] = await getAnnualAttendanceSummary("user-1", "course-1");

		expect(summary.totalDays).toBe(0);
		expect(summary.attendancePct).toBe(100);
		expect(summary.absencePct).toBe(0);
	});

	it("separa correctamente a varios estudiantes distintos", async () => {
		vi.mocked(attendanceCalendarRepository.findAnnualSummaryRows).mockResolvedValue([
			{
				student_id: "s1",
				order_number: 1,
				first_name: "Ana",
				second_name: null,
				first_lastname: "Pérez",
				second_lastname: null,
				active: true,
				month: "2027-08-01",
				p: "5",
				t: "0",
				a: "0",
				e: "0",
			},
			{
				student_id: "s2",
				order_number: 2,
				first_name: "Luis",
				second_name: null,
				first_lastname: "Gómez",
				second_lastname: null,
				active: true,
				month: "2027-08-01",
				p: "3",
				t: "0",
				a: "2",
				e: "0",
			},
		] as never);

		const result = await getAnnualAttendanceSummary("user-1", "course-1");

		expect(result).toHaveLength(2);
		expect(result.map((s) => s.studentId)).toEqual(["s1", "s2"]);
	});
});
