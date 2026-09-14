import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyProfile } from "@/contexts/identity/application/get-my-profile.use-case.js";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/identity/infrastructure/db/teacher-profile.repository.js", () => ({
	findProfileWithUserAndSubject: vi.fn(),
}));

describe("getMyProfile", () => {
	beforeEach(() => {
		vi.mocked(teacherProfileRepository.findProfileWithUserAndSubject).mockReset();
	});

	it("lanza NotFoundError si el perfil no existe", async () => {
		vi.mocked(teacherProfileRepository.findProfileWithUserAndSubject).mockResolvedValue(undefined);

		await expect(getMyProfile("user-1")).rejects.toThrow(NotFoundError);
	});

	it("devuelve el perfil encontrado", async () => {
		const profile = { name: "Ana Pérez", email: "ana@example.test" };
		vi.mocked(teacherProfileRepository.findProfileWithUserAndSubject).mockResolvedValue(
			profile as never,
		);

		const result = await getMyProfile("user-1");

		expect(result).toBe(profile);
	});
});
