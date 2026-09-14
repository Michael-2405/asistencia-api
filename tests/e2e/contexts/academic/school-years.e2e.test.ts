import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { schoolYears } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { registerAndAuthenticate } from "../../../support/auth.js";

describe("GET /school-years", () => {
	it("devuelve los años escolares sin requerir autenticación", async () => {
		await db
			.insert(schoolYears)
			.values({ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" });

		const response = await supertest(app).get("/school-years");

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(1);
	});
});

describe("POST /school-years", () => {
	it("rechaza la petición sin sesión autenticada", async () => {
		const response = await supertest(app).post("/school-years").send({
			name: "2027-2028",
			startDate: "2027-08-01",
			endDate: "2028-06-30",
		});

		expect(response.status).toBe(401);
	});

	it("crea el año escolar cuando el docente está autenticado", async () => {
		const { agent } = await registerAndAuthenticate();

		const response = await agent.post("/school-years").send({
			name: "2027-2028",
			startDate: "2027-08-01",
			endDate: "2028-06-30",
		});

		expect(response.status).toBe(201);
		expect(response.body.data.name).toBe("2027-2028");
	});

	it("devuelve conflicto si el rango se superpone con uno existente", async () => {
		const { agent } = await registerAndAuthenticate();
		await db
			.insert(schoolYears)
			.values({ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" });

		const response = await agent.post("/school-years").send({
			name: "2028-2029",
			startDate: "2028-01-01",
			endDate: "2029-01-01",
		});

		expect(response.status).toBe(409);
	});
});
