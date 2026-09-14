import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSubjectMatchesLevel } from "@/contexts/academic/application/assert-subject-matches-level.js";
import * as subjectsRepository from "@/contexts/academic/infrastructure/db/subjects.repository.js";
import { ValidationError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/subjects.repository.js", () => ({
	findById: vi.fn(),
}));

describe("assertSubjectMatchesLevel", () => {
	beforeEach(() => {
		vi.mocked(subjectsRepository.findById).mockReset();
	});

	it("lanza ValidationError si la materia no existe", async () => {
		vi.mocked(subjectsRepository.findById).mockResolvedValue(undefined);

		await expect(assertSubjectMatchesLevel("subject-1", "PRIMARY")).rejects.toThrow(
			ValidationError,
		);
	});

	it("lanza ValidationError si el nivel de la materia no coincide", async () => {
		vi.mocked(subjectsRepository.findById).mockResolvedValue({ level: "SECONDARY" } as never);

		await expect(assertSubjectMatchesLevel("subject-1", "PRIMARY")).rejects.toThrow(
			ValidationError,
		);
	});

	it("no lanza error si la materia es de nivel BOTH", async () => {
		vi.mocked(subjectsRepository.findById).mockResolvedValue({ level: "BOTH" } as never);

		await expect(assertSubjectMatchesLevel("subject-1", "PRIMARY")).resolves.toBeUndefined();
	});

	it("no lanza error si el nivel de la materia coincide exactamente", async () => {
		vi.mocked(subjectsRepository.findById).mockResolvedValue({ level: "PRIMARY" } as never);

		await expect(assertSubjectMatchesLevel("subject-1", "PRIMARY")).resolves.toBeUndefined();
	});
});
