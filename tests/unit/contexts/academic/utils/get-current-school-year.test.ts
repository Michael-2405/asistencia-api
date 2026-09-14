import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schoolYearsRepository from "@/contexts/academic/infrastructure/db/school-years.repository.js";
import { getCurrentSchoolYear } from "@/contexts/academic/utils/get-current-school-year.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/school-years.repository.js", () => ({
	findCurrent: vi.fn(),
}));

describe("getCurrentSchoolYear", () => {
	beforeEach(() => {
		vi.mocked(schoolYearsRepository.findCurrent).mockReset();
	});

	it("lanza NotFoundError si no hay un año escolar activo hoy", async () => {
		vi.mocked(schoolYearsRepository.findCurrent).mockResolvedValue(undefined);

		await expect(getCurrentSchoolYear()).rejects.toThrow(NotFoundError);
	});

	it("devuelve el año escolar activo", async () => {
		const schoolYear = { id: "sy-1", name: "2027-2028" };
		vi.mocked(schoolYearsRepository.findCurrent).mockResolvedValue(schoolYear as never);

		const result = await getCurrentSchoolYear();

		expect(result).toBe(schoolYear);
	});
});
