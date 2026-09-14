import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/contexts/identity/application/verify-password.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import { ValidationError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/identity/infrastructure/auth/auth.config.js", () => ({
	auth: { api: { verifyPassword: vi.fn() } },
}));

describe("verifyPassword", () => {
	beforeEach(() => {
		vi.mocked(auth.api.verifyPassword).mockReset();
	});

	it("no lanza error si la contraseña es correcta", async () => {
		vi.mocked(auth.api.verifyPassword).mockResolvedValue(undefined as never);

		await expect(verifyPassword("password123", {})).resolves.toBeUndefined();
	});

	it("lanza ValidationError si Better Auth rechaza la contraseña", async () => {
		vi.mocked(auth.api.verifyPassword).mockRejectedValue(new Error("wrong password"));

		await expect(verifyPassword("wrong", {})).rejects.toThrow(ValidationError);
	});
});
