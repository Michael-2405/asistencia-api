import { beforeEach, describe, expect, it, vi } from "vitest";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { NotFoundError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	findByIdAndUserId: vi.fn(),
}));

describe("assertCourseOwnership", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.findByIdAndUserId).mockReset();
	});

	it("lanza NotFoundError si el curso no existe o no pertenece al usuario", async () => {
		vi.mocked(coursesRepository.findByIdAndUserId).mockResolvedValue(undefined);

		await expect(assertCourseOwnership("course-1", "user-1")).rejects.toThrow(NotFoundError);
	});

	it("devuelve el curso cuando pertenece al usuario", async () => {
		const course = { id: "course-1", userId: "user-1", schoolYearId: "sy-1" };
		vi.mocked(coursesRepository.findByIdAndUserId).mockResolvedValue(course as never);

		const result = await assertCourseOwnership("course-1", "user-1");

		expect(result).toBe(course);
	});
});
