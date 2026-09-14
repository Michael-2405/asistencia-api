import { describe, expect, it } from "vitest";
import { courses, schoolYears } from "@/contexts/academic/infrastructure/db/schema.js";
import * as courseNonInstructionalDaysRepository from "@/contexts/attendance/infrastructure/db/course-non-instructional-days.repository.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

async function insertCourse() {
	const owner = await insertTestUser();
	const [schoolYear] = await db
		.insert(schoolYears)
		.values({ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" })
		.returning();
	const [course] = await db
		.insert(courses)
		.values({
			userId: owner.id,
			schoolYearId: schoolYear.id,
			grade: "3",
			section: "A",
			educationLevel: "PRIMARY",
			isHomeroom: true,
		})
		.returning();
	return course;
}

describe("course-non-instructional-days.repository", () => {
	describe("insert", () => {
		it("inserta el día no laborable y lo devuelve", async () => {
			const course = await insertCourse();

			const day = await courseNonInstructionalDaysRepository.insert({
				courseId: course.id,
				date: "2027-09-10",
				reason: "Actividad del curso",
			});

			expect(day).toMatchObject({
				courseId: course.id,
				date: "2027-09-10",
				reason: "Actividad del curso",
			});
		});

		it("lanza el error de Postgres al duplicar (courseId, date)", async () => {
			const course = await insertCourse();
			await courseNonInstructionalDaysRepository.insert({
				courseId: course.id,
				date: "2027-09-10",
				reason: null,
			});

			await expect(
				courseNonInstructionalDaysRepository.insert({
					courseId: course.id,
					date: "2027-09-10",
					reason: "Otra razón",
				}),
			).rejects.toThrow();
		});
	});
});
