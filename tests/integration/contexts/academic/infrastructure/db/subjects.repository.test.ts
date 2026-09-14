import { describe, expect, it } from "vitest";
import { subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import * as subjectsRepository from "@/contexts/academic/infrastructure/db/subjects.repository.js";
import { db } from "@/shared/db/client.js";

describe("subjects.repository", () => {
	describe("findAll", () => {
		it("devuelve todas las materias en la base de datos", async () => {
			await db.insert(subjects).values([
				{ name: "Matemática", code: "MAT", level: "BOTH", isCore: true },
				{ name: "Educación Física", code: "EDF", level: "PRIMARY", isCore: false },
			]);

			const rows = await subjectsRepository.findAll();

			expect(rows).toHaveLength(2);
			expect(rows.map((r) => r.code).sort()).toEqual(["EDF", "MAT"]);
		});

		it("devuelve un arreglo vacío si no hay materias", async () => {
			const rows = await subjectsRepository.findAll();
			expect(rows).toEqual([]);
		});
	});

	describe("findById", () => {
		it("devuelve la materia cuando existe", async () => {
			const [inserted] = await db
				.insert(subjects)
				.values({ name: "Matemática", code: "MAT", level: "BOTH", isCore: true })
				.returning();

			const found = await subjectsRepository.findById(inserted.id);

			expect(found?.id).toBe(inserted.id);
			expect(found?.code).toBe("MAT");
		});

		it("devuelve undefined cuando no existe", async () => {
			const found = await subjectsRepository.findById("00000000-0000-0000-0000-000000000000");
			expect(found).toBeUndefined();
		});
	});
});
