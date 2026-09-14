import { describe, expect, it } from "vitest";
import {
	courseNonInstructionalDays,
	courses,
	officialNonInstructionalDays,
	schoolYears,
	students,
} from "@/contexts/academic/infrastructure/db/schema.js";
import * as attendanceCalendarRepository from "@/contexts/attendance/infrastructure/db/attendance-calendar.repository.js";
import * as attendanceRecordsRepository from "@/contexts/attendance/infrastructure/db/attendance-records.repository.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

function countWeekdays(year: number, monthIndex0: number) {
	const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
	let count = 0;
	for (let d = 1; d <= daysInMonth; d++) {
		const dow = new Date(year, monthIndex0, d).getDay();
		if (dow !== 0 && dow !== 6) count++;
	}
	return count;
}

async function insertSchoolYearAndCourse() {
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
	return { owner, schoolYear, course };
}

describe("attendance-calendar.repository", () => {
	describe("findCalendarDays", () => {
		it("solo incluye días de lunes a viernes, y marca los no laborables oficiales y del curso", async () => {
			const { schoolYear, course } = await insertSchoolYearAndCourse();

			// 2027-09-08 es miércoles; 2027-09-10 es viernes.
			await db
				.insert(officialNonInstructionalDays)
				.values({ schoolYearId: schoolYear.id, date: "2027-09-08", reason: "Feriado oficial" });
			await db
				.insert(courseNonInstructionalDays)
				.values({ courseId: course.id, date: "2027-09-10", reason: "Actividad del curso" });

			const rows = (await attendanceCalendarRepository.findCalendarDays(
				course.id,
				schoolYear.id,
				"2027-09-01",
			)) as { date: string; non_instructional: boolean }[];

			expect(rows).toHaveLength(countWeekdays(2027, 8));
			expect(rows.find((r) => r.date === "2027-09-08")?.non_instructional).toBe(true);
			expect(rows.find((r) => r.date === "2027-09-10")?.non_instructional).toBe(true);
			expect(rows.find((r) => r.date === "2027-09-09")?.non_instructional).toBe(false);
		});
	});

	describe("findStudentMonthlyStatusRows", () => {
		it("agrega el estado de asistencia por fecha para cada estudiante del curso", async () => {
			const { course } = await insertSchoolYearAndCourse();
			const [student] = await db
				.insert(students)
				.values({ courseId: course.id, orderNumber: 1, firstName: "Ana", firstLastname: "Pérez" })
				.returning();

			await attendanceRecordsRepository.insertMany([
				{ studentId: student.id, courseId: course.id, date: "2027-09-08", statusCode: "P" },
			]);

			const rows = (await attendanceCalendarRepository.findStudentMonthlyStatusRows(
				course.id,
				"2027-09-01",
			)) as { student_id: string; status_by_date: Record<string, string> }[];

			expect(rows).toHaveLength(1);
			expect(rows[0].status_by_date).toEqual({ "2027-09-08": "P" });
		});
	});

	describe("findSchoolYearDateRange", () => {
		it("devuelve el rango de fechas del año escolar", async () => {
			const { schoolYear } = await insertSchoolYearAndCourse();

			const range = (await attendanceCalendarRepository.findSchoolYearDateRange(schoolYear.id)) as {
				start_date: string;
				end_date: string;
			};

			expect(range.start_date).toBe("2027-08-01");
			expect(range.end_date).toBe("2028-06-30");
		});
	});

	describe("findAnnualSummaryRows", () => {
		it("cuenta presencias/tardanzas/ausencias/excusas por estudiante y por mes", async () => {
			const { course } = await insertSchoolYearAndCourse();
			const [student] = await db
				.insert(students)
				.values({ courseId: course.id, orderNumber: 1, firstName: "Ana", firstLastname: "Pérez" })
				.returning();

			await attendanceRecordsRepository.insertMany([
				{ studentId: student.id, courseId: course.id, date: "2027-09-08", statusCode: "P" },
				{ studentId: student.id, courseId: course.id, date: "2027-09-09", statusCode: "A" },
				{ studentId: student.id, courseId: course.id, date: "2027-10-08", statusCode: "T" },
			]);

			const rows = (await attendanceCalendarRepository.findAnnualSummaryRows(
				course.id,
				"2027-08-01",
				"2028-06-30",
			)) as { month: string; p: string; a: string; t: string; e: string }[];

			const september = rows.find((r) => r.month === "2027-09-01");
			const october = rows.find((r) => r.month === "2027-10-01");

			expect(september?.p).toBe("1");
			expect(september?.a).toBe("1");
			expect(october?.t).toBe("1");
		});
	});
});
