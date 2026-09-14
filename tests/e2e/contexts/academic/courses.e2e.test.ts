import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { courses, schoolYears, subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { registerAndAuthenticate } from "../../../support/auth.js";

function isoDate(daysFromToday: number) {
	const date = new Date();
	date.setDate(date.getDate() + daysFromToday);
	return date.toISOString().split("T")[0];
}

async function insertActiveSchoolYear(name = "2027-2028") {
	const [schoolYear] = await db
		.insert(schoolYears)
		.values({ name, startDate: isoDate(-30), endDate: isoDate(30) })
		.returning();
	return schoolYear;
}

const courseBody = {
	grade: "3",
	section: "A",
	educationLevel: "PRIMARY" as const,
	isHomeroom: true,
};

describe("POST /courses", () => {
	it("rechaza la petición sin sesión autenticada", async () => {
		const response = await supertest(app).post("/courses").send(courseBody);
		expect(response.status).toBe(401);
	});

	it("crea el curso en el año escolar activo cuando el docente está autenticado", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();

		const response = await agent.post("/courses").send(courseBody);

		expect(response.status).toBe(201);
		expect(response.body.data).toMatchObject({ grade: "3", section: "A" });
	});

	it("devuelve NOT_FOUND si no hay un año escolar activo", async () => {
		const { agent } = await registerAndAuthenticate();

		const response = await agent.post("/courses").send(courseBody);

		expect(response.status).toBe(404);
	});

	it("devuelve conflicto al repetir la misma sección/materia en el mismo año", async () => {
		// subjectId debe ir seteado: la constraint de unicidad usa (userId, schoolYearId, grade,
		// section, subjectId), y Postgres trata NULL como distinto de NULL — dos cursos de
		// encargado (isHomeroom, subjectId null) con la misma sección NO chocan contra esta
		// constraint. Ver nota al equipo sobre este hallazgo.
		await insertActiveSchoolYear();
		const [subject] = await db
			.insert(subjects)
			.values({ name: "Matemática", code: "MAT", level: "PRIMARY", isCore: true })
			.returning();
		const { agent } = await registerAndAuthenticate();
		const areaBody = { ...courseBody, isHomeroom: false, subjectId: subject.id };
		await agent.post("/courses").send(areaBody);

		const response = await agent.post("/courses").send(areaBody);

		expect(response.status).toBe(409);
	});
});

describe("GET /courses", () => {
	it("solo devuelve los cursos del docente autenticado", async () => {
		await insertActiveSchoolYear();
		const teacherA = await registerAndAuthenticate();
		const teacherB = await registerAndAuthenticate();

		await teacherA.agent.post("/courses").send(courseBody);
		await teacherB.agent.post("/courses").send({ ...courseBody, section: "B" });

		const response = await teacherA.agent.get("/courses");

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].section).toBe("A");
	});
});

describe("PATCH /courses/:courseId", () => {
	it("devuelve NOT_FOUND si el curso no pertenece al docente autenticado", async () => {
		await insertActiveSchoolYear();
		const owner = await registerAndAuthenticate();
		const intruder = await registerAndAuthenticate();
		const created = await owner.agent.post("/courses").send(courseBody);

		const response = await intruder.agent
			.patch(`/courses/${created.body.data.id}`)
			.send({ ...courseBody, grade: "4" });

		expect(response.status).toBe(404);
	});

	it("actualiza el curso cuando pertenece al docente autenticado", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const created = await agent.post("/courses").send(courseBody);

		const response = await agent
			.patch(`/courses/${created.body.data.id}`)
			.send({ ...courseBody, grade: "4" });

		expect(response.status).toBe(200);
		expect(response.body.data.grade).toBe("4");
	});
});

describe("DELETE /courses/:courseId", () => {
	it("desactiva el curso y deja de aparecer en el listado", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const created = await agent.post("/courses").send(courseBody);

		const response = await agent.delete(`/courses/${created.body.data.id}`);
		expect(response.status).toBe(200);

		const list = await agent.get("/courses");
		expect(list.body.data).toHaveLength(0);
	});
});

describe("POST /courses/clone", () => {
	it("clona los cursos del año fuente hacia el año escolar activo", async () => {
		const [sourceYear] = await db
			.insert(schoolYears)
			.values({ name: "2025-2026", startDate: isoDate(-400), endDate: isoDate(-35) })
			.returning();
		const activeYear = await insertActiveSchoolYear();
		const { agent, userId } = await registerAndAuthenticate();

		const [sourceCourse] = await db
			.insert(courses)
			.values({
				userId,
				schoolYearId: sourceYear.id,
				grade: "3",
				section: "A",
				educationLevel: "PRIMARY",
				isHomeroom: true,
			})
			.returning();

		const response = await agent.post("/courses/clone").send({
			sourceSchoolYearId: sourceYear.id,
			courseIds: [sourceCourse.id],
		});

		expect(response.status).toBe(201);
		expect(response.body.data.createdCount).toBe(1);
		expect(response.body.data.skippedCount).toBe(0);

		const list = await agent.get("/courses").query({ schoolYearId: activeYear.id });
		expect(list.body.data).toHaveLength(1);
	});
});
