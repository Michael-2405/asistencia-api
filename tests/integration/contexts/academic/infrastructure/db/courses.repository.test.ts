import { describe, expect, it } from "vitest";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { courses, schoolYears, students } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

async function insertSchoolYear(name = "2027-2028") {
	const [schoolYear] = await db
		.insert(schoolYears)
		.values({ name, startDate: "2027-08-01", endDate: "2028-06-30" })
		.returning();
	return schoolYear;
}

describe("courses.repository", () => {
	describe("findByIdAndUserId", () => {
		it("devuelve el curso solo si pertenece al usuario dado", async () => {
			const owner = await insertTestUser();
			const otherUser = await insertTestUser();
			const schoolYear = await insertSchoolYear();
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

			const found = await coursesRepository.findByIdAndUserId(course.id, owner.id);
			expect(found?.id).toBe(course.id);

			const notFound = await coursesRepository.findByIdAndUserId(course.id, otherUser.id);
			expect(notFound).toBeUndefined();
		});
	});

	describe("findManyWithStudentCounts", () => {
		it("cuenta estudiantes activos e inactivos por curso y excluye cursos inactivos", async () => {
			const owner = await insertTestUser();
			const schoolYear = await insertSchoolYear();
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
			const [inactiveCourse] = await db
				.insert(courses)
				.values({
					userId: owner.id,
					schoolYearId: schoolYear.id,
					grade: "4",
					section: "B",
					educationLevel: "PRIMARY",
					isHomeroom: true,
					active: false,
				})
				.returning();

			await db.insert(students).values([
				{ courseId: course.id, orderNumber: 1, firstName: "Ana", firstLastname: "Pérez" },
				{
					courseId: course.id,
					orderNumber: 2,
					firstName: "Luis",
					firstLastname: "Gómez",
					active: false,
				},
			]);

			const rows = await coursesRepository.findManyWithStudentCounts(owner.id);

			expect(rows.map((r) => r.id)).not.toContain(inactiveCourse.id);
			const row = rows.find((r) => r.id === course.id);
			expect(row?.activeStudentCount).toBe(1);
			expect(row?.inactiveStudentCount).toBe(1);
		});

		it("filtra por schoolYearId cuando se provee", async () => {
			const owner = await insertTestUser();
			const schoolYearA = await insertSchoolYear("2026-2027");
			const schoolYearB = await insertSchoolYear("2027-2028");
			await db.insert(courses).values([
				{
					userId: owner.id,
					schoolYearId: schoolYearA.id,
					grade: "3",
					section: "A",
					educationLevel: "PRIMARY",
					isHomeroom: true,
				},
				{
					userId: owner.id,
					schoolYearId: schoolYearB.id,
					grade: "3",
					section: "A",
					educationLevel: "PRIMARY",
					isHomeroom: true,
				},
			]);

			const rows = await coursesRepository.findManyWithStudentCounts(owner.id, schoolYearA.id);

			expect(rows).toHaveLength(1);
			expect(rows[0].schoolYearId).toBe(schoolYearA.id);
		});
	});

	describe("insert / update / deactivate", () => {
		it("inserta, actualiza y desactiva un curso", async () => {
			const owner = await insertTestUser();
			const schoolYear = await insertSchoolYear();

			const inserted = await coursesRepository.insert({
				userId: owner.id,
				schoolYearId: schoolYear.id,
				grade: "3",
				section: "A",
				educationLevel: "PRIMARY",
				isHomeroom: true,
			});
			expect(inserted.grade).toBe("3");

			const updated = await coursesRepository.update(inserted.id, { grade: "4" });
			expect(updated?.grade).toBe("4");

			const deactivated = await coursesRepository.deactivate(inserted.id);
			expect(deactivated?.active).toBe(false);
		});
	});
});
