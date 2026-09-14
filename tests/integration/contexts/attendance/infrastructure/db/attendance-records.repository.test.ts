import { describe, expect, it } from "vitest";
import { courses, schoolYears, students } from "@/contexts/academic/infrastructure/db/schema.js";
import * as attendanceRecordsRepository from "@/contexts/attendance/infrastructure/db/attendance-records.repository.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

function isoDate(daysFromToday: number) {
	const date = new Date();
	date.setDate(date.getDate() + daysFromToday);
	return date.toISOString().split("T")[0];
}

async function insertCourseWithStudent(overrides?: { userId?: string; active?: boolean }) {
	const owner = overrides?.userId ? { id: overrides.userId } : await insertTestUser();
	const [schoolYear] = await db
		.insert(schoolYears)
		.values({
			name: `${1990 + Math.floor(Math.random() * 900)}-${1991 + Math.floor(Math.random() * 900)}`,
			startDate: isoDate(-30),
			endDate: isoDate(30),
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
			active: overrides?.active ?? true,
		})
		.returning();
	const [student] = await db
		.insert(students)
		.values({ courseId: course.id, orderNumber: 1, firstName: "Ana", firstLastname: "Pérez" })
		.returning();
	return { owner, course, student };
}

describe("attendance-records.repository", () => {
	describe("findExistingForCourseAndDate / insertMany", () => {
		it("no encuentra registros antes de insertar, y sí después", async () => {
			const { course, student } = await insertCourseWithStudent();
			const date = isoDate(0);

			expect(
				await attendanceRecordsRepository.findExistingForCourseAndDate(course.id, date),
			).toEqual([]);

			await attendanceRecordsRepository.insertMany([
				{ studentId: student.id, courseId: course.id, date, statusCode: "P" },
			]);

			const found = await attendanceRecordsRepository.findExistingForCourseAndDate(course.id, date);
			expect(found).toHaveLength(1);
		});
	});

	describe("findStudentsEligibility", () => {
		it("devuelve id, active y withdrawalDate solo de los estudiantes pedidos en ese curso", async () => {
			const { course } = await insertCourseWithStudent();
			const [active, withdrawn] = await db
				.insert(students)
				.values([
					{ courseId: course.id, orderNumber: 2, firstName: "Luis", firstLastname: "Gómez" },
					{
						courseId: course.id,
						orderNumber: 3,
						firstName: "Eva",
						firstLastname: "Ruiz",
						active: false,
						withdrawalDate: isoDate(-5),
					},
				])
				.returning();

			const rows = await attendanceRecordsRepository.findStudentsEligibility(course.id, [
				active.id,
				withdrawn.id,
			]);

			expect(rows).toHaveLength(2);
			const withdrawnRow = rows.find((r) => r.id === withdrawn.id);
			expect(withdrawnRow?.active).toBe(false);
			expect(withdrawnRow?.withdrawalDate).toBe(isoDate(-5));
		});
	});

	describe("findTodayStatusByUser", () => {
		it("marca submitted=true solo para el curso con asistencia de hoy, y excluye cursos inactivos", async () => {
			const owner = await insertTestUser();
			const withRecord = await insertCourseWithStudent({ userId: owner.id });
			const withoutRecord = await insertCourseWithStudent({ userId: owner.id });
			await insertCourseWithStudent({ userId: owner.id, active: false });

			await attendanceRecordsRepository.insertMany([
				{
					studentId: withRecord.student.id,
					courseId: withRecord.course.id,
					date: isoDate(0),
					statusCode: "P",
				},
			]);

			const rows = (await attendanceRecordsRepository.findTodayStatusByUser(owner.id)) as {
				course_id: string;
				submitted: boolean;
			}[];

			expect(rows).toHaveLength(2);
			expect(rows.find((r) => r.course_id === withRecord.course.id)?.submitted).toBe(true);
			expect(rows.find((r) => r.course_id === withoutRecord.course.id)?.submitted).toBe(false);
		});
	});
});
