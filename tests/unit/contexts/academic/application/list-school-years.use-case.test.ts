import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSchoolYears } from "@/contexts/academic/application/list-school-years.use-case.js";
import * as schoolYearsRepository from "@/contexts/academic/infrastructure/db/school-years.repository.js";

vi.mock("@/contexts/academic/infrastructure/db/school-years.repository.js", () => ({
	findAllOrderedByStartDateDesc: vi.fn(),
}));

describe("listSchoolYears", () => {
	beforeEach(() => {
		vi.mocked(schoolYearsRepository.findAllOrderedByStartDateDesc).mockReset();
	});

	it("devuelve los resultados del repositorio sin transformarlos", async () => {
		const rows = [{ id: "sy1", name: "2027-2028", startDate: "2027-08-01", endDate: "2028-06-30" }];
		vi.mocked(schoolYearsRepository.findAllOrderedByStartDateDesc).mockResolvedValue(rows as never);

		const result = await listSchoolYears();

		expect(result).toBe(rows);
		expect(schoolYearsRepository.findAllOrderedByStartDateDesc).toHaveBeenCalledOnce();
	});
});
