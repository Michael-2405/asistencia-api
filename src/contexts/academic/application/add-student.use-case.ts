import type { AddStudentInput } from "../domain/add-student.schema.js";
import * as studentsRepository from "../infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

const MAX_RETRIES = 3;

export async function addStudent(userId: string, courseId: string, input: AddStudentInput) {
	await assertCourseOwnership(courseId, userId);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const lastOrderNumber = await studentsRepository.findLastOrderNumber(courseId);
		const nextOrderNumber = (lastOrderNumber ?? 0) + 1;

		try {
			const student = await studentsRepository.insert({
				courseId,
				orderNumber: nextOrderNumber,
				firstName: input.firstName,
				secondName: input.secondName,
				firstLastname: input.firstLastname,
				secondLastname: input.secondLastname,
				birthDate: input.birthDate,
				sex: input.sex,
			});

			return student;
		} catch (error) {
			const isLastAttempt = attempt === MAX_RETRIES - 1;
			if (!isPgUniqueViolation(error) || isLastAttempt) throw error;
		}
	}

	throw new Error("No se pudo asignar número de orden tras varios intentos");
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
