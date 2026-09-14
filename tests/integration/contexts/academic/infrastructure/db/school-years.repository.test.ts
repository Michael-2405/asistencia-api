import { describe, expect, it } from "vitest";
import { schoolYears } from "@/contexts/academic/infrastructure/db/schema.js";
import * as schoolYearsRepository from "@/contexts/academic/infrastructure/db/school-years.repository.js";
import { db } from "@/shared/db/client.js";

describe("school-years.repository", () => {
	describe("findAllOrderedByStartDateDesc", () => {
		it("devuelve los años escolares ordenados por fecha de inicio descendente", async () => {
			await db.insert(schoolYears).values([
				{ name: "2025-2026", startDate: "2025-08-01", endDate: "2026-06-30" },
				{ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" },
				{ name: "2026-2027", startDate: "2026-08-01", endDate: "2027-06-30" },
			]);

			const rows = await schoolYearsRepository.findAllOrderedByStartDateDesc();

			expect(rows.map((r) => r.name)).toEqual(["2027-2028", "2026-2027", "2025-2026"]);
		});
	});

	describe("findOverlapping", () => {
		it("devuelve los años escolares cuyo rango se superpone y ninguno si no hay superposición", async () => {
			await db
				.insert(schoolYears)
				.values({ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" });

			const overlapping = await schoolYearsRepository.findOverlapping("2028-01-01", "2028-12-31");
			expect(overlapping).toHaveLength(1);

			const nonOverlapping = await schoolYearsRepository.findOverlapping(
				"2029-01-01",
				"2029-12-31",
			);
			expect(nonOverlapping).toHaveLength(0);
		});
	});

	describe("findCurrent", () => {
		it("devuelve el año escolar que contiene la fecha dada, y undefined si ninguno la contiene", async () => {
			await db
				.insert(schoolYears)
				.values({ name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" });

			const current = await schoolYearsRepository.findCurrent("2027-10-15");
			expect(current?.name).toBe("2027-2028");

			const none = await schoolYearsRepository.findCurrent("2029-01-01");
			expect(none).toBeUndefined();
		});
	});

	describe("insert", () => {
		it("inserta y devuelve el año escolar creado", async () => {
			const created = await schoolYearsRepository.insert({
				name: "2027-2028",
				startDate: "2027-08-01",
				endDate: "2028-06-30",
			});

			expect(created.name).toBe("2027-2028");
			expect(created.id).toBeDefined();
		});
	});
});
