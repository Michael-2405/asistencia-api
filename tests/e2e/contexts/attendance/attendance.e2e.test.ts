import { and, eq } from "drizzle-orm";
import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { schoolYears, students } from "@/contexts/academic/infrastructure/db/schema.js";
import { attendanceRecords } from "@/contexts/attendance/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { registerAndAuthenticate } from "../../../support/auth.js";

function isoDate(daysFromToday: number) {
	const date = new Date();
	date.setDate(date.getDate() + daysFromToday);
	return date.toISOString().split("T")[0];
}

async function insertActiveSchoolYear() {
	await db
		.insert(schoolYears)
		.values({ name: "2027-2028", startDate: isoDate(-30), endDate: isoDate(30) });
}

async function createCourse(agent: ReturnType<typeof supertest.agent>) {
	const response = await agent
		.post("/courses")
		.send({ grade: "3", section: "A", educationLevel: "PRIMARY", isHomeroom: true });
	return response.body.data.id as string;
}

async function addStudent(agent: ReturnType<typeof supertest.agent>, courseId: string) {
	const response = await agent
		.post(`/courses/${courseId}/students`)
		.send({ firstName: "Ana", firstLastname: "Pérez" });
	return response.body.data.id as string;
}

describe("POST /courses/:courseId/attendance/day", () => {
	it("rechaza la petición sin sesión autenticada", async () => {
		const response = await supertest(app)
			.post("/courses/some-course-id/attendance/day")
			.send({ date: isoDate(0), records: [] });
		expect(response.status).toBe(401);
	});

	it("devuelve NOT_FOUND si el curso no pertenece al docente autenticado", async () => {
		await insertActiveSchoolYear();
		const owner = await registerAndAuthenticate();
		const intruder = await registerAndAuthenticate();
		const courseId = await createCourse(owner.agent);
		const studentId = await addStudent(owner.agent, courseId);

		const response = await intruder.agent.post(`/courses/${courseId}/attendance/day`).send({
			date: isoDate(0),
			records: [{ studentId, status: "P" }],
		});

		expect(response.status).toBe(404);
	});

	it("registra la asistencia del día de hoy", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const studentId = await addStudent(agent, courseId);

		const response = await agent.post(`/courses/${courseId}/attendance/day`).send({
			date: isoDate(0),
			records: [{ studentId, status: "P" }],
		});

		expect(response.status).toBe(201);
		expect(response.body.data.saved).toBe(1);
	});

	it("rechaza registrar asistencia con una fecha distinta a hoy", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const studentId = await addStudent(agent, courseId);

		const response = await agent.post(`/courses/${courseId}/attendance/day`).send({
			date: isoDate(-1),
			records: [{ studentId, status: "P" }],
		});

		expect(response.status).toBe(400);
	});

	it("devuelve conflicto si la asistencia de ese día ya fue registrada", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const studentId = await addStudent(agent, courseId);
		await agent
			.post(`/courses/${courseId}/attendance/day`)
			.send({ date: isoDate(0), records: [{ studentId, status: "P" }] });

		const response = await agent
			.post(`/courses/${courseId}/attendance/day`)
			.send({ date: isoDate(0), records: [{ studentId, status: "A" }] });

		expect(response.status).toBe(409);
	});

	it("rechaza registrar asistencia para un estudiante retirado antes de la fecha registrada", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const studentId = await addStudent(agent, courseId);
		await agent.patch(`/courses/${courseId}/students/${studentId}/withdraw`);

		const response = await agent
			.post(`/courses/${courseId}/attendance/day`)
			.send({ date: isoDate(0), records: [{ studentId, status: "P" }] });

		expect(response.status).toBe(400);
	});

	// Bug de aislamiento multi-tenant encontrado en esta sesión (ver TECH_DEBT.md) y corregido en
	// save-daily-attendance.use-case.ts: un studentId que no aparece en absoluto en el roster del
	// curso (porque pertenece a otro curso, propio o ajeno) debe rechazarse con ValidationError,
	// distinto del caso "pertenece al curso pero está retirado". La protección es solo de
	// aplicación — no hay FK compuesta (courseId, studentId) a nivel de esquema, decisión pendiente
	// documentada en TECH_DEBT.md.
	it("rechaza un studentId de OTRO curso ajeno dentro de records de un curso propio", async () => {
		await insertActiveSchoolYear();
		const owner = await registerAndAuthenticate();
		const stranger = await registerAndAuthenticate();
		const ownCourseId = await createCourse(owner.agent);
		const strangerCourseId = await createCourse(stranger.agent);
		const strangerStudentId = await addStudent(stranger.agent, strangerCourseId);

		const response = await owner.agent.post(`/courses/${ownCourseId}/attendance/day`).send({
			date: isoDate(0),
			records: [{ studentId: strangerStudentId, status: "P" }],
		});

		expect(response.status).toBe(400);

		const inserted = await db
			.select()
			.from(attendanceRecords)
			.where(
				and(
					eq(attendanceRecords.courseId, ownCourseId),
					eq(attendanceRecords.studentId, strangerStudentId),
				),
			);
		expect(inserted).toHaveLength(0);
	});
});

describe("GET /courses/:courseId/attendance", () => {
	it("devuelve el calendario del mes y, para un estudiante retirado, active:false y su withdrawalDate", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const withdrawnDate = isoDate(-5);
		const [withdrawnStudent] = await db
			.insert(students)
			.values({
				courseId,
				orderNumber: 1,
				firstName: "Eva",
				firstLastname: "Ruiz",
				active: false,
				withdrawalDate: withdrawnDate,
			})
			.returning();

		const now = new Date();
		const response = await agent
			.get(`/courses/${courseId}/attendance`)
			.query({ year: now.getFullYear(), month: now.getMonth() + 1 });

		expect(response.status).toBe(200);
		expect(response.body.data.calendarDays.length).toBeGreaterThan(0);
		const row = response.body.data.rows.find(
			(r: { studentId: string }) => r.studentId === withdrawnStudent.id,
		);
		expect(row).toBeDefined();
		expect(row.active).toBe(false);
		expect(row.withdrawalDate).toBe(withdrawnDate);
	});
});

describe("GET /courses/:courseId/attendance/annual-summary", () => {
	it("devuelve el resumen anual con totales por estudiante", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const studentId = await addStudent(agent, courseId);
		await agent
			.post(`/courses/${courseId}/attendance/day`)
			.send({ date: isoDate(0), records: [{ studentId, status: "P" }] });

		const response = await agent.get(`/courses/${courseId}/attendance/annual-summary`);

		expect(response.status).toBe(200);
		const entry = response.body.data.find((r: { studentId: string }) => r.studentId === studentId);
		expect(entry).toBeDefined();
		expect(entry.totalDays).toBeGreaterThanOrEqual(1);
	});
});

describe("GET /courses/attendance-status", () => {
	it("marca submitted true solo para cursos con asistencia registrada hoy", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const withRecordCourseId = await createCourse(agent);
		const secondCourseResponse = await agent
			.post("/courses")
			.send({ grade: "4", section: "B", educationLevel: "PRIMARY", isHomeroom: true });
		const withoutRecordCourseId = secondCourseResponse.body.data.id as string;
		const studentId = await addStudent(agent, withRecordCourseId);
		await agent
			.post(`/courses/${withRecordCourseId}/attendance/day`)
			.send({ date: isoDate(0), records: [{ studentId, status: "P" }] });

		const response = await agent.get("/courses/attendance-status");

		expect(response.status).toBe(200);
		const withRecord = response.body.data.find(
			(r: { courseId: string }) => r.courseId === withRecordCourseId,
		);
		const withoutRecord = response.body.data.find(
			(r: { courseId: string }) => r.courseId === withoutRecordCourseId,
		);
		expect(withRecord.submitted).toBe(true);
		expect(withoutRecord.submitted).toBe(false);
	});
});
