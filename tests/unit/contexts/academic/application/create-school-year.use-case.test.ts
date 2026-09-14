import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchoolYear } from "@/contexts/academic/application/create-school-year.use-case.js";
import * as schoolYearsRepository from "@/contexts/academic/infrastructure/db/school-years.repository.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/school-years.repository.js", () => ({
	findOverlapping: vi.fn(),
	insert: vi.fn(),
}));

describe("createSchoolYear", () => {
	const input = { name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" };

	beforeEach(() => {
		vi.mocked(schoolYearsRepository.findOverlapping).mockReset();
		vi.mocked(schoolYearsRepository.insert).mockReset();
	});

	it("lanza ConflictError si el rango se superpone con un año escolar existente", async () => {
		vi.mocked(schoolYearsRepository.findOverlapping).mockResolvedValue([
			{ id: "sy1", name: "2026-2027" },
		] as never);

		await expect(createSchoolYear(input)).rejects.toThrow(ConflictError);
		expect(schoolYearsRepository.insert).not.toHaveBeenCalled();
	});

	it("inserta y devuelve el año escolar cuando no hay superposición", async () => {
		vi.mocked(schoolYearsRepository.findOverlapping).mockResolvedValue([]);
		const created = { id: "sy2", ...input };
		vi.mocked(schoolYearsRepository.insert).mockResolvedValue(created as never);

		const result = await createSchoolYear(input);

		expect(result).toBe(created);
		expect(schoolYearsRepository.insert).toHaveBeenCalledWith(input);
	});

	it("traduce una violación de unicidad del nombre a ConflictError", async () => {
		vi.mocked(schoolYearsRepository.findOverlapping).mockResolvedValue([]);
		vi.mocked(schoolYearsRepository.insert).mockRejectedValue({ code: "23505" });

		await expect(createSchoolYear(input)).rejects.toThrow(ConflictError);
	});
});
