import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateStudent } from "@/contexts/academic/application/update-student.use-case.js";
import * as studentsRepository from "@/contexts/academic/infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/students.repository.js", () => ({
	updateById: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

const input = { firstName: "Ana", firstLastname: "Pérez" };

describe("updateStudent", () => {
	beforeEach(() => {
		vi.mocked(studentsRepository.updateById).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("lanza NotFoundError si el estudiante no pertenece al curso", async () => {
		vi.mocked(studentsRepository.updateById).mockResolvedValue(undefined);

		await expect(updateStudent("user-1", "course-1", "student-1", input)).rejects.toThrow(
			NotFoundError,
		);
	});

	it("devuelve el estudiante actualizado", async () => {
		const updated = { id: "student-1", ...input };
		vi.mocked(studentsRepository.updateById).mockResolvedValue(updated as never);

		const result = await updateStudent("user-1", "course-1", "student-1", input);

		expect(result).toBe(updated);
	});
});
