import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCourses } from "@/contexts/academic/application/list-courses.use-case.js";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	findManyWithStudentCounts: vi.fn(),
}));

describe("listCourses", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.findManyWithStudentCounts).mockReset();
	});

	it("delega en el repositorio con el userId y schoolYearId dados", async () => {
		const rows = [{ id: "course-1" }];
		vi.mocked(coursesRepository.findManyWithStudentCounts).mockResolvedValue(rows as never);

		const result = await listCourses("user-1", "sy-1");

		expect(result).toBe(rows);
		expect(coursesRepository.findManyWithStudentCounts).toHaveBeenCalledWith("user-1", "sy-1");
	});
});
