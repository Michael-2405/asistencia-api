import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { saveDailyAttendance } from "@/contexts/attendance/application/save-daily-attendance.use-case.js";
import * as attendanceRecordsRepository from "@/contexts/attendance/infrastructure/db/attendance-records.repository.js";
import { ConflictError, ValidationError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/attendance/infrastructure/db/attendance-records.repository.js", () => ({
	findStudentsEligibility: vi.fn(),
	findExistingForCourseAndDate: vi.fn(),
	insertMany: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

function todayIso() {
	return new Date().toISOString().split("T")[0];
}

const input = {
	date: todayIso(),
	records: [{ studentId: "student-1", status: "P" as const }],
};

describe("saveDailyAttendance", () => {
	beforeEach(() => {
		vi.mocked(attendanceRecordsRepository.findStudentsEligibility).mockReset();
		vi.mocked(attendanceRecordsRepository.findExistingForCourseAndDate).mockReset();
		vi.mocked(attendanceRecordsRepository.insertMany).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
		vi.mocked(attendanceRecordsRepository.findStudentsEligibility).mockResolvedValue([
			{ id: "student-1", active: true, withdrawalDate: null },
		] as never);
		vi.mocked(attendanceRecordsRepository.findExistingForCourseAndDate).mockResolvedValue([]);
	});

	it("lanza ValidationError si la fecha no es hoy", async () => {
		await expect(
			saveDailyAttendance("user-1", "course-1", { ...input, date: "2020-01-01" }),
		).rejects.toThrow(ValidationError);
	});

	it("lanza ValidationError si un studentId no pertenece en absoluto al roster del curso", async () => {
		// Distinto del caso "pertenece pero está retirado": aquí el estudiante ni siquiera aparece
		// en la consulta de elegibilidad del curso (porque pertenece a otro curso, propio o ajeno).
		vi.mocked(attendanceRecordsRepository.findStudentsEligibility).mockResolvedValue([]);

		await expect(saveDailyAttendance("user-1", "course-1", input)).rejects.toThrow(ValidationError);
		expect(attendanceRecordsRepository.insertMany).not.toHaveBeenCalled();
	});

	it("lanza ValidationError si hay un estudiante retirado inelegible", async () => {
		vi.mocked(attendanceRecordsRepository.findStudentsEligibility).mockResolvedValue([
			{ id: "student-1", active: false, withdrawalDate: todayIso() },
		] as never);

		await expect(saveDailyAttendance("user-1", "course-1", input)).rejects.toThrow(ValidationError);
	});

	it("permite a un estudiante retirado con fecha de retiro futura respecto al día registrado", async () => {
		const future = new Date();
		future.setDate(future.getDate() + 5);
		vi.mocked(attendanceRecordsRepository.findStudentsEligibility).mockResolvedValue([
			{
				id: "student-1",
				active: false,
				withdrawalDate: future.toISOString().split("T")[0],
			},
		] as never);

		const result = await saveDailyAttendance("user-1", "course-1", input);

		expect(result).toEqual({ saved: 1 });
	});

	it("lanza ConflictError si ya existe asistencia registrada ese día", async () => {
		vi.mocked(attendanceRecordsRepository.findExistingForCourseAndDate).mockResolvedValue([
			{ id: "record-1" },
		] as never);

		await expect(saveDailyAttendance("user-1", "course-1", input)).rejects.toThrow(ConflictError);
		expect(attendanceRecordsRepository.insertMany).not.toHaveBeenCalled();
	});

	it("traduce una violación de unicidad en el insert a ConflictError", async () => {
		vi.mocked(attendanceRecordsRepository.insertMany).mockRejectedValue({ code: "23505" });

		await expect(saveDailyAttendance("user-1", "course-1", input)).rejects.toThrow(ConflictError);
	});

	it("guarda la asistencia y devuelve la cantidad de registros guardados", async () => {
		vi.mocked(attendanceRecordsRepository.insertMany).mockResolvedValue(undefined);

		const result = await saveDailyAttendance("user-1", "course-1", input);

		expect(result).toEqual({ saved: 1 });
		expect(attendanceRecordsRepository.insertMany).toHaveBeenCalledWith([
			{ studentId: "student-1", courseId: "course-1", date: input.date, statusCode: "P" },
		]);
	});
});
