import { beforeEach, describe, expect, it, vi } from "vitest";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { AccountSuspendedError } from "@/shared/errors/app-error.js";
import { checkNotSuspended } from "@/shared/middleware/check-not-suspended.middleware.js";

vi.mock("@/contexts/identity/infrastructure/db/teacher-profile.repository.js", () => ({
	findByUserId: vi.fn(),
}));

describe("checkNotSuspended", () => {
	const req = { userId: "user-1" } as never;
	const res = {} as never;
	let next: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.mocked(teacherProfileRepository.findByUserId).mockReset();
		next = vi.fn();
	});

	it("llama a next() sin argumentos si la cuenta no está suspendida", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: null,
		} as never);

		await checkNotSuspended(req, res, next);

		expect(next).toHaveBeenCalledWith();
	});

	it("llama a next() sin argumentos si no hay perfil (aún no completado el registro)", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue(undefined);

		await checkNotSuspended(req, res, next);

		expect(next).toHaveBeenCalledWith();
	});

	it("llama a next(AccountSuspendedError) si la cuenta está suspendida", async () => {
		vi.mocked(teacherProfileRepository.findByUserId).mockResolvedValue({
			suspendedAt: new Date(),
			scheduledDeletionAt: new Date(),
		} as never);

		await checkNotSuspended(req, res, next);

		expect(next).toHaveBeenCalledWith(expect.any(AccountSuspendedError));
	});
});
