import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";

describe("GET /subjects", () => {
	it("devuelve el envelope de éxito con las materias existentes", async () => {
		await db.insert(subjects).values({
			name: "Matemática",
			code: "MAT",
			level: "BOTH",
			isCore: true,
		});

		const response = await supertest(app).get("/subjects");

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("success");
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0]).toMatchObject({ code: "MAT", name: "Matemática" });
	});

	it("devuelve un arreglo vacío cuando no hay materias", async () => {
		const response = await supertest(app).get("/subjects");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: "success", data: [] });
	});
});
