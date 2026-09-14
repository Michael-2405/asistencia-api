import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { AddStudentInput } from "../domain/add-student.schema.js";
import * as studentsRepository from "../infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "../utils/assert-course-ownership.js";

export async function updateStudent(
	userId: string,
	courseId: string,
	studentId: string,
	input: AddStudentInput,
) {
	await assertCourseOwnership(courseId, userId);

	const updated = await studentsRepository.updateById(courseId, studentId, {
		firstName: input.firstName,
		secondName: input.secondName,
		firstLastname: input.firstLastname,
		secondLastname: input.secondLastname,
		birthDate: input.birthDate,
		sex: input.sex,
		updatedAt: new Date(),
	});

	if (!updated) {
		throw new NotFoundError("Estudiante no encontrado en este curso");
	}

	return updated;
}
