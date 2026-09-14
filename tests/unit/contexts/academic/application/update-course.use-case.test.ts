import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSubjectMatchesLevel } from "@/contexts/academic/application/assert-subject-matches-level.js";
import { updateCourse } from "@/contexts/academic/application/update-course.use-case.js";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	update: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));
vi.mock("@/contexts/academic/application/assert-subject-matches-level.js", () => ({
	assertSubjectMatchesLevel: vi.fn(),
}));

const input = {
	grade: "3",
	section: "A",
	educationLevel: "PRIMARY" as const,
	isHomeroom: true,
};

describe("updateCourse", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.update).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertSubjectMatchesLevel).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("verifica la pertenencia del curso antes de actualizar", async () => {
		vi.mocked(coursesRepository.update).mockResolvedValue({ id: "course-1" } as never);

		await updateCourse("user-1", "course-1", input);

		expect(assertCourseOwnership).toHaveBeenCalledWith("course-1", "user-1");
	});

	it("traduce una violación de unicidad a ConflictError", async () => {
		vi.mocked(coursesRepository.update).mockRejectedValue({ code: "23505" });

		await expect(updateCourse("user-1", "course-1", input)).rejects.toThrow(ConflictError);
	});
});
