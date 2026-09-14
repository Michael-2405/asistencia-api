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

const studentBody = { firstName: "Ana", firstLastname: "Pérez" };

async function createCourse(agent: ReturnType<typeof supertest.agent>) {
	const response = await agent
		.post("/courses")
		.send({ grade: "3", section: "A", educationLevel: "PRIMARY", isHomeroom: true });
	return response.body.data.id as string;
}

describe("students endpoints", () => {
	it("rechaza agregar un estudiante sin sesión autenticada", async () => {
		const response = await supertest(app)
			.post("/courses/some-course-id/students")
			.send(studentBody);
		expect(response.status).toBe(401);
	});

	it("agrega estudiantes asignando números de orden consecutivos", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);

		const first = await agent.post(`/courses/${courseId}/students`).send(studentBody);
		const second = await agent
			.post(`/courses/${courseId}/students`)
			.send({ firstName: "Luis", firstLastname: "Gómez" });

		expect(first.body.data.orderNumber).toBe(1);
		expect(second.body.data.orderNumber).toBe(2);
	});

	it("devuelve NOT_FOUND al agregar un estudiante a un curso ajeno", async () => {
		await insertActiveSchoolYear();
		const owner = await registerAndAuthenticate();
		const intruder = await registerAndAuthenticate();
		const courseId = await createCourse(owner.agent);

		const response = await intruder.agent.post(`/courses/${courseId}/students`).send(studentBody);

		expect(response.status).toBe(404);
	});

	it("lista los estudiantes de un curso ordenados por número de orden", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		await agent.post(`/courses/${courseId}/students`).send(studentBody);

		const response = await agent.get(`/courses/${courseId}/students`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(1);
	});

	it("actualiza un estudiante existente", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const created = await agent.post(`/courses/${courseId}/students`).send(studentBody);

		const response = await agent
			.patch(`/courses/${courseId}/students/${created.body.data.id}`)
			.send({ firstName: "Ana María", firstLastname: "Pérez" });

		expect(response.status).toBe(200);
		expect(response.body.data.firstName).toBe("Ana María");
	});

	it("retira a un estudiante marcándolo inactivo con la fecha de hoy", async () => {
		await insertActiveSchoolYear();
		const { agent } = await registerAndAuthenticate();
		const courseId = await createCourse(agent);
		const created = await agent.post(`/courses/${courseId}/students`).send(studentBody);

		const response = await agent.patch(
			`/courses/${courseId}/students/${created.body.data.id}/withdraw`,
		);

		expect(response.status).toBe(200);
		expect(response.body.data.active).toBe(false);
		expect(response.body.data.withdrawalDate).toBe(isoDate(0));
	});
});
