import { beforeEach, describe, expect, it, vi } from "vitest";
import { suspendAccount } from "@/contexts/identity/application/suspend-account.use-case.js";
import { verifyPassword } from "@/contexts/identity/application/verify-password.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/identity/infrastructure/db/teacher-profile.repository.js", () => ({
	findByUserId: vi.fn(),
	updateSuspension: vi.fn(),
}));
vi.mock("@/contexts/identity/application/verify-password.js", () => ({
	verifyPassword: vi.fn(),
}));
vi.mock("@/contexts/identity/infrastructure/auth/auth.config.js", () => ({
	auth: { api: { revokeSessions: vi.fn() } },
}));

describe("suspendAccount", () => {
	beforeEach(() => {
		vi.mocked(teacherProfileRepository.findByUserId).mockReset();
		vi.mocked(teacherProfileRepository.updateSuspension).mockReset();
		vi.mocked(verifyPassword).mockReset();
		vi.mocked(auth.api.revokeSessions).mockReset();
		vi.mocked(verifyPassword).mockResolvedValue(undefined);
	});

	it("lanza ConflictError si la cuenta ya está suspendida", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: new Date(),
		} as never);

		await expect(suspendAccount("user-1", "password123", {})).rejects.toThrow(ConflictError);
		expect(verifyPassword).not.toHaveBeenCalled();
	});

	it("verifica la contraseña, suspende la cuenta y revoca las sesiones", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: null,
		} as never);

		const result = await suspendAccount("user-1", "password123", {});

		expect(verifyPassword).toHaveBeenCalledWith("password123", {});
		expect(teacherProfileRepository.updateSuspension).toHaveBeenCalledWith(
			"user-1",
			expect.objectContaining({ suspendedAt: expect.any(Date) }),
		);
		expect(auth.api.revokeSessions).toHaveBeenCalled();
		expect(result.scheduledDeletionAt).toBeInstanceOf(Date);
	});

	it("programa el borrado 30 días después", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: null,
		} as never);

		const before = Date.now();
		const result = await suspendAccount("user-1", "password123", {});
		const diffDays = (result.scheduledDeletionAt.getTime() - before) / (1000 * 60 * 60 * 24);

		expect(diffDays).toBeGreaterThan(29.9);
		expect(diffDays).toBeLessThan(30.1);
	});
});
