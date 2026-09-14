import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { schoolYears } from "@/contexts/academic/infrastructure/db/schema.js";
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

describe("POST /courses/:courseId/non-instructional-days", () => {
	it("rechaza la petición sin sesión autenticada", async () => {
		const response = await supertest(app)
			.post("/courses/some-course-id/non-instructional-days")
			.send({ date: isoDate(1) });
		expect(response.status).toBe(401);
	});

	it("devuelve NOT_FOUND si el curso no pertenece al docente autenticado", async () => {
		await insertActiveSchoolYear();
		const owner = await registerAndAuthenticate();
		const intruder = await registerAndAuthenticate();
		const courseId = await createCourse(owner.agent);

		const response = await intruder.agent
			.post(`/courses/${courseId}/non-instructional-days`)
			.send({ date: isoDate(1), reason: "Actividad del curso" });

		expect(response.status).toBe(404);
	});

	it("marca el día como no laborable para el curso", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);

		const response = await agent
			.post(`/courses/${courseId}/non-instructional-days`)
			.send({ date: isoDate(1), reason: "Actividad del curso" });

		expect(response.status).toBe(201);
		expect(response.body.data).toMatchObject({ courseId, date: isoDate(1) });
	});

	it("devuelve conflicto al marcar el mismo día dos veces para el mismo curso", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		await agent.post(`/courses/${courseId}/non-instructional-days`).send({ date: isoDate(1) });

		const response = await agent
			.post(`/courses/${courseId}/non-instructional-days`)
			.send({ date: isoDate(1) });

		expect(response.status).toBe(409);
	});
});
