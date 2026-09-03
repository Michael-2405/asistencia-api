import { desc, eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { students } from "../infrastructure/db/schema.js";
import type { AddStudentInput } from "./add-student.schema.js";
import { assertCourseOwnership } from "./assert-course-ownership.js";

const MAX_RETRIES = 3;

export async function addStudent(userId: string, courseId: string, input: AddStudentInput) {
	await assertCourseOwnership(courseId, userId);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const [lastStudent] = await db
			.select({ orderNumber: students.orderNumber })
			.from(students)
			.where(eq(students.courseId, courseId))
			.orderBy(desc(students.orderNumber))
			.limit(1);

		const nextOrderNumber = (lastStudent?.orderNumber ?? 0) + 1;

		try {
			const [student] = await db
				.insert(students)
				.values({
					courseId,
					orderNumber: nextOrderNumber,
					firstName: input.firstName,
					secondName: input.secondName,
					firstLastname: input.firstLastname,
					secondLastname: input.secondLastname,
					birthDate: input.birthDate,
					sex: input.sex,
				})
				.returning();

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
