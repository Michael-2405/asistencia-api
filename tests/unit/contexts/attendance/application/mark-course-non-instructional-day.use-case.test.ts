import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";
import { markCourseNonInstructionalDay } from "@/contexts/attendance/application/mark-course-non-instructional-day.use-case.js";
import * as courseNonInstructionalDaysRepository from "@/contexts/attendance/infrastructure/db/course-non-instructional-days.repository.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock(
	"@/contexts/attendance/infrastructure/db/course-non-instructional-days.repository.js",
	() => ({
		insert: vi.fn(),
	}),
);
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

const input = { date: "2027-10-12", reason: "Feriado" };

describe("markCourseNonInstructionalDay", () => {
	beforeEach(() => {
		vi.mocked(courseNonInstructionalDaysRepository.insert).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("verifica la pertenencia del curso y marca el día", async () => {
		const day = { id: "day-1", ...input };
		vi.mocked(courseNonInstructionalDaysRepository.insert).mockResolvedValue(day as never);

		const result = await markCourseNonInstructionalDay("user-1", "course-1", input);

		expect(assertCourseOwnership).toHaveBeenCalledWith("course-1", "user-1");
		expect(result).toBe(day);
	});

	it("traduce una violación de unicidad a ConflictError", async () => {
		vi.mocked(courseNonInstructionalDaysRepository.insert).mockRejectedValue({ code: "23505" });

		await expect(markCourseNonInstructionalDay("user-1", "course-1", input)).rejects.toThrow(
			ConflictError,
		);
	});
});
