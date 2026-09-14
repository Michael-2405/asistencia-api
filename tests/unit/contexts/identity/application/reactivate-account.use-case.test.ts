import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactivateAccount } from "@/contexts/identity/application/reactivate-account.use-case.js";
import { verifyPassword } from "@/contexts/identity/application/verify-password.js";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { ValidationError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/identity/infrastructure/db/teacher-profile.repository.js", () => ({
	findByUserId: vi.fn(),
	updateSuspension: vi.fn(),
}));
vi.mock("@/contexts/identity/application/verify-password.js", () => ({
	verifyPassword: vi.fn(),
}));

describe("reactivateAccount", () => {
	beforeEach(() => {
		vi.mocked(teacherProfileRepository.findByUserId).mockReset();
		vi.mocked(teacherProfileRepository.updateSuspension).mockReset();
		vi.mocked(verifyPassword).mockReset();
		vi.mocked(verifyPassword).mockResolvedValue(undefined);
	});

	it("lanza ValidationError si la cuenta no está suspendida", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: null,
		} as never);

		await expect(reactivateAccount("user-1", "password123", {})).rejects.toThrow(ValidationError);
		expect(verifyPassword).not.toHaveBeenCalled();
	});

	it("verifica la contraseña y limpia la suspensión", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: new Date(),
		} as never);

		const result = await reactivateAccount("user-1", "password123", {});

		expect(verifyPassword).toHaveBeenCalledWith("password123", {});
		expect(teacherProfileRepository.updateSuspension).toHaveBeenCalledWith("user-1", {
			suspendedAt: null,
			scheduledDeletionAt: null,
		});
		expect(result).toEqual({ reactivated: true });
	});
});
