import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTodayAttendanceStatus } from "@/contexts/attendance/application/get-today-attendance-status.use-case.js";
import * as attendanceRecordsRepository from "@/contexts/attendance/infrastructure/db/attendance-records.repository.js";

vi.mock("@/contexts/attendance/infrastructure/db/attendance-records.repository.js", () => ({
	findTodayStatusByUser: vi.fn(),
}));

describe("getTodayAttendanceStatus", () => {
	beforeEach(() => {
		vi.mocked(attendanceRecordsRepository.findTodayStatusByUser).mockReset();
	});

	it("transforma las filas snake_case del repositorio a camelCase", async () => {
		vi.mocked(attendanceRecordsRepository.findTodayStatusByUser).mockResolvedValue([
			{ course_id: "course-1", submitted: true },
			{ course_id: "course-2", submitted: false },
		] as never);

		const result = await getTodayAttendanceStatus("user-1");

		expect(result).toEqual([
			{ courseId: "course-1", submitted: true },
			{ courseId: "course-2", submitted: false },
		]);
	});
});
