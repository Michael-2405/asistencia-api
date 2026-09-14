import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudents } from "@/contexts/academic/application/list-students.use-case.js";
import * as studentsRepository from "@/contexts/academic/infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";

vi.mock("@/contexts/academic/infrastructure/db/students.repository.js", () => ({
	findManyByCourseId: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

describe("listStudents", () => {
	beforeEach(() => {
		vi.mocked(studentsRepository.findManyByCourseId).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("verifica la pertenencia del curso y devuelve sus estudiantes", async () => {
		const rows = [{ id: "student-1" }];
		vi.mocked(studentsRepository.findManyByCourseId).mockResolvedValue(rows as never);

		const result = await listStudents("user-1", "course-1");

		expect(assertCourseOwnership).toHaveBeenCalledWith("course-1", "user-1");
		expect(result).toBe(rows);
	});
});
