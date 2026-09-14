import { describe, expect, it } from "vitest";
import { courses, schoolYears } from "@/contexts/academic/infrastructure/db/schema.js";
import * as studentsRepository from "@/contexts/academic/infrastructure/db/students.repository.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

let schoolYearCounter = 0;

async function insertCourse() {
	const owner = await insertTestUser();
	const startYear = 2000 + schoolYearCounter++;
	const [schoolYear] = await db
		.insert(schoolYears)
		.values({
			name: `${startYear}-${startYear + 1}`,
			startDate: `${startYear}-08-01`,
			endDate: `${startYear + 1}-06-30`,
		})
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

describe("students.repository", () => {
	describe("findLastOrderNumber", () => {
		it("devuelve el mayor número de orden del curso, o undefined si no hay estudiantes", async () => {
			const course = await insertCourse();
			expect(await studentsRepository.findLastOrderNumber(course.id)).toBeUndefined();

			await studentsRepository.insert({
				courseId: course.id,
				orderNumber: 1,
				firstName: "Ana",
				firstLastname: "Pérez",
			});
			await studentsRepository.insert({
				courseId: course.id,
				orderNumber: 2,
				firstName: "Luis",
				firstLastname: "Gómez",
			});

			expect(await studentsRepository.findLastOrderNumber(course.id)).toBe(2);
		});
	});

	describe("findManyByCourseId", () => {
		it("devuelve los estudiantes del curso ordenados por número de orden", async () => {
			const course = await insertCourse();
			await studentsRepository.insert({
				courseId: course.id,
				orderNumber: 2,
				firstName: "Luis",
				firstLastname: "Gómez",
			});
			await studentsRepository.insert({
				courseId: course.id,
				orderNumber: 1,
				firstName: "Ana",
				firstLastname: "Pérez",
			});

			const rows = await studentsRepository.findManyByCourseId(course.id);

			expect(rows.map((r) => r.orderNumber)).toEqual([1, 2]);
		});
	});

	describe("updateById", () => {
		it("actualiza solo si el estudiante pertenece al curso indicado", async () => {
			const course = await insertCourse();
			const otherCourse = await insertCourse();
			const student = await studentsRepository.insert({
				courseId: course.id,
				orderNumber: 1,
				firstName: "Ana",
				firstLastname: "Pérez",
			});

			const wrongCourseUpdate = await studentsRepository.updateById(otherCourse.id, student.id, {
				firstName: "Otro",
			});
			expect(wrongCourseUpdate).toBeUndefined();

			const updated = await studentsRepository.updateById(course.id, student.id, {
				firstName: "Ana María",
			});
			expect(updated?.firstName).toBe("Ana María");
		});
	});
});
