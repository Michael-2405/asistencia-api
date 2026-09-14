import { beforeEach, describe, expect, it, vi } from "vitest";
import { withdrawStudent } from "@/contexts/academic/application/withdraw-student.use-case.js";
import * as studentsRepository from "@/contexts/academic/infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/students.repository.js", () => ({
	updateById: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

describe("withdrawStudent", () => {
	beforeEach(() => {
		vi.mocked(studentsRepository.updateById).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("lanza NotFoundError si el estudiante no pertenece al curso", async () => {
		vi.mocked(studentsRepository.updateById).mockResolvedValue(undefined);

		await expect(withdrawStudent("user-1", "course-1", "student-1")).rejects.toThrow(NotFoundError);
	});

	it("marca al estudiante como inactivo con la fecha de retiro de hoy", async () => {
		vi.mocked(studentsRepository.updateById).mockResolvedValue({ id: "student-1" } as never);

		await withdrawStudent("user-1", "course-1", "student-1");

		const today = new Date().toISOString().split("T")[0];
		expect(studentsRepository.updateById).toHaveBeenCalledWith(
			"course-1",
			"student-1",
			expect.objectContaining({ active: false, withdrawalDate: today }),
		);
	});
});
