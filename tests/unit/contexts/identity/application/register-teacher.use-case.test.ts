import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSubjectMatchesLevel } from "@/contexts/academic/application/assert-subject-matches-level.js";
import { registerTeacher } from "@/contexts/identity/application/register-teacher.use-case.js";
import { auth } from "@/contexts/identity/infrastructure/auth/auth.config.js";
import * as authUserRepository from "@/contexts/identity/infrastructure/db/auth-user.repository.js";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/identity/infrastructure/db/auth-user.repository.js", () => ({
	findByEmail: vi.fn(),
	deleteById: vi.fn(),
}));
vi.mock("@/contexts/identity/infrastructure/db/teacher-profile.repository.js", () => ({
	insert: vi.fn(),
}));
vi.mock("@/contexts/academic/application/assert-subject-matches-level.js", () => ({
	assertSubjectMatchesLevel: vi.fn(),
}));
vi.mock("@/contexts/identity/infrastructure/auth/auth.config.js", () => ({
	auth: { api: { signUpEmail: vi.fn() } },
}));

const input = {
	fullName: "Ana Pérez",
	email: "ana@example.test",
	password: "password123",
	educationLevel: "PRIMARY" as const,
	isHomeroomTeacher: true,
};

describe("registerTeacher", () => {
	beforeEach(() => {
		vi.mocked(authUserRepository.findByEmail).mockReset();
		vi.mocked(authUserRepository.deleteById).mockReset();
		vi.mocked(teacherProfileRepository.insert).mockReset();
		vi.mocked(assertSubjectMatchesLevel).mockReset();
		vi.mocked(auth.api.signUpEmail).mockReset();
		vi.mocked(authUserRepository.findByEmail).mockResolvedValue(undefined);
	});

	it("lanza ConflictError si ya existe una cuenta con ese correo", async () => {
		vi.mocked(authUserRepository.findByEmail).mockResolvedValue({ id: "user-1" } as never);

		await expect(registerTeacher(input)).rejects.toThrow(ConflictError);
		expect(auth.api.signUpEmail).not.toHaveBeenCalled();
	});

	it("valida la materia contra el nivel cuando se provee subjectId", async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValue({ user: { id: "user-1" } } as never);
		vi.mocked(teacherProfileRepository.insert).mockResolvedValue(undefined);

		await registerTeacher({ ...input, isHomeroomTeacher: false, subjectId: "subject-1" });

		expect(assertSubjectMatchesLevel).toHaveBeenCalledWith("subject-1", "PRIMARY");
	});

	it("crea la cuenta y el perfil del docente", async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValue({ user: { id: "user-1" } } as never);
		vi.mocked(teacherProfileRepository.insert).mockResolvedValue(undefined);

		const result = await registerTeacher(input);

		expect(result).toEqual({ userId: "user-1" });
		expect(teacherProfileRepository.insert).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "user-1", educationLevel: "PRIMARY" }),
		);
	});

	it("lanza un error si Better Auth no devuelve usuario", async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValue({ user: null } as never);

		await expect(registerTeacher(input)).rejects.toThrow();
		expect(teacherProfileRepository.insert).not.toHaveBeenCalled();
	});

	it("revierte la cuenta creada si falla el insert del perfil, y traduce violación de unicidad", async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValue({ user: { id: "user-1" } } as never);
		vi.mocked(teacherProfileRepository.insert).mockRejectedValue({ code: "23505" });

		await expect(registerTeacher(input)).rejects.toThrow(ConflictError);
		expect(authUserRepository.deleteById).toHaveBeenCalledWith("user-1");
	});

	it("revierte la cuenta y propaga el error si no es una violación de unicidad", async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValue({ user: { id: "user-1" } } as never);
		vi.mocked(teacherProfileRepository.insert).mockRejectedValue(new Error("db down"));

		await expect(registerTeacher(input)).rejects.toThrow("db down");
		expect(authUserRepository.deleteById).toHaveBeenCalledWith("user-1");
	});
});
