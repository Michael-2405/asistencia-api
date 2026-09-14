import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { ConflictError, ValidationError } from "@/shared/errors/app-error.js";
import type { SaveDailyAttendanceInput } from "../domain/save-daily-attendance.schema.js";
import * as attendanceRecordsRepository from "../infrastructure/db/attendance-records.repository.js";

function todayIso(): string {
	return new Date().toISOString().split("T")[0];
}

export async function saveDailyAttendance(
	userId: string,
	courseId: string,
	input: SaveDailyAttendanceInput,
) {
	await assertCourseOwnership(courseId, userId);

	if (input.date !== todayIso()) {
		throw new ValidationError("Solo se puede registrar la asistencia del día de hoy");
	}

	const studentIds = input.records.map((r) => r.studentId);

	const studentRows = await attendanceRecordsRepository.findStudentsEligibility(
		courseId,
		studentIds,
	);

	const foundIds = new Set(studentRows.map((s) => s.id));
	const unknownIds = studentIds.filter((id) => !foundIds.has(id));
	if (unknownIds.length > 0) {
		throw new ValidationError("Uno o más estudiantes no pertenecen a este curso");
	}

	const withdrawnIneligible = studentRows.filter((s) => {
		if (s.active) return false;
		return !s.withdrawalDate || s.withdrawalDate <= input.date;
	});

	if (withdrawnIneligible.length > 0) {
		throw new ValidationError(
			`No se puede registrar asistencia para estudiante(s) retirado(s): ${withdrawnIneligible.map((s) => s.id).join(", ")}`,
		);
	}

	const existing = await attendanceRecordsRepository.findExistingForCourseAndDate(
		courseId,
		input.date,
	);

	if (existing.length > 0) {
		throw new ConflictError("La asistencia de este día ya fue registrada");
	}

	try {
		await attendanceRecordsRepository.insertMany(
			input.records.map((r) => ({
				studentId: r.studentId,
				courseId,
				date: input.date,
				statusCode: r.status,
			})),
		);
	} catch (error) {
		if (isPgUniqueViolation(error))
			throw new ConflictError("La asistencia de este día ya fue registrada");
		throw error;
	}

	return { saved: input.records.length };
}

function isPgUniqueViolation(error: unknown): boolean {
	const pgError = error instanceof Error && error.cause ? error.cause : error;
	return (
		typeof pgError === "object" && pgError !== null && "code" in pgError && pgError.code === "23505"
	);
}
