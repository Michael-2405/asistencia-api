import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCourse } from "@/contexts/academic/application/delete-course.use-case.js";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	deactivate: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

describe("deleteCourse", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.deactivate).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
	});

	it("verifica la pertenencia del curso y lo desactiva", async () => {
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
		const deactivated = { id: "course-1", active: false };
		vi.mocked(coursesRepository.deactivate).mockResolvedValue(deactivated as never);

		const result = await deleteCourse("user-1", "course-1");

		expect(assertCourseOwnership).toHaveBeenCalledWith("course-1", "user-1");
		expect(coursesRepository.deactivate).toHaveBeenCalledWith("course-1");
		expect(result).toBe(deactivated);
	});
});
