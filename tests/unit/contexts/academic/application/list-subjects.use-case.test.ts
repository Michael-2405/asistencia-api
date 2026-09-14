import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSubjects } from "@/contexts/academic/application/list-subjects.use-case.js";
import * as subjectsRepository from "@/contexts/academic/infrastructure/db/subjects.repository.js";

vi.mock("@/contexts/academic/infrastructure/db/subjects.repository.js", () => ({
	findAll: vi.fn(),
}));

describe("listSubjects", () => {
	beforeEach(() => {
		vi.mocked(subjectsRepository.findAll).mockReset();
	});

	it("devuelve los resultados del repositorio sin transformarlos", async () => {
		const rows = [
			{
				id: "11111111-1111-1111-1111-111111111111",
				name: "Matemática",
				code: "MAT",
				level: "BOTH",
				isCore: true,
				active: true,
			},
		];
		vi.mocked(subjectsRepository.findAll).mockResolvedValue(rows as never);

		const result = await listSubjects();

		expect(result).toBe(rows);
		expect(subjectsRepository.findAll).toHaveBeenCalledOnce();
	});
});
