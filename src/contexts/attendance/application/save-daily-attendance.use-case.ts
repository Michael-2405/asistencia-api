import { and, eq, inArray } from "drizzle-orm";
import { students } from "@/contexts/academic/infrastructure/db/schema.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { db } from "@/shared/db/client.js";
import { ConflictError, ValidationError } from "@/shared/errors/app-error.js";
import type { SaveDailyAttendanceInput } from "../domain/save-daily-attendance.schema.js";
import { attendanceRecords } from "../infrastructure/db/schema.js";

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

	const studentRows = await db
		.select({ id: students.id, active: students.active, withdrawalDate: students.withdrawalDate })
		.from(students)
		.where(and(eq(students.courseId, courseId), inArray(students.id, studentIds)));

	const withdrawnIneligible = studentRows.filter((s) => {
		if (s.active) return false;
		// Retirado, pero con fecha de retiro futura respecto al día que se registra: aún elegible.
		return !s.withdrawalDate || s.withdrawalDate <= input.date;
	});

	if (withdrawnIneligible.length > 0) {
		throw new ValidationError(
			`No se puede registrar asistencia para estudiante(s) retirado(s): ${withdrawnIneligible.map((s) => s.id).join(", ")}`,
		);
	}

	const existing = await db
		.select({ id: attendanceRecords.id })
		.from(attendanceRecords)
		.where(and(eq(attendanceRecords.courseId, courseId), eq(attendanceRecords.date, input.date)))
		.limit(1);

	if (existing.length > 0) {
		throw new ConflictError("La asistencia de este día ya fue registrada");
	}

	try {
		await db.insert(attendanceRecords).values(
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
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
