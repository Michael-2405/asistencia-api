import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSubjectMatchesLevel } from "@/contexts/academic/application/assert-subject-matches-level.js";
import { createCourse } from "@/contexts/academic/application/create-course.use-case.js";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { getCurrentSchoolYear } from "@/contexts/academic/utils/get-current-school-year.js";
import { ConflictError } from "@/shared/errors/app-error.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	insert: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/get-current-school-year.js", () => ({
	getCurrentSchoolYear: vi.fn(),
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

describe("createCourse", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.insert).mockReset();
		vi.mocked(getCurrentSchoolYear).mockReset();
		vi.mocked(assertSubjectMatchesLevel).mockReset();
		vi.mocked(getCurrentSchoolYear).mockResolvedValue({ id: "sy-1" } as never);
	});

	it("crea el curso en el año escolar activo", async () => {
		const created = { id: "course-1" };
		vi.mocked(coursesRepository.insert).mockResolvedValue(created as never);

		const result = await createCourse("user-1", input);

		expect(result).toBe(created);
		expect(coursesRepository.insert).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "user-1", schoolYearId: "sy-1" }),
		);
	});

	it("valida la materia contra el nivel cuando se provee subjectId", async () => {
		vi.mocked(coursesRepository.insert).mockResolvedValue({ id: "course-1" } as never);

		await createCourse("user-1", { ...input, isHomeroom: false, subjectId: "subject-1" });

		expect(assertSubjectMatchesLevel).toHaveBeenCalledWith("subject-1", "PRIMARY");
	});

	it("no valida materia cuando el curso es de encargado (sin subjectId)", async () => {
		vi.mocked(coursesRepository.insert).mockResolvedValue({ id: "course-1" } as never);

		await createCourse("user-1", input);

		expect(assertSubjectMatchesLevel).not.toHaveBeenCalled();
	});

	it("traduce una violación de unicidad a ConflictError", async () => {
		vi.mocked(coursesRepository.insert).mockRejectedValue({ code: "23505" });

		await expect(createCourse("user-1", input)).rejects.toThrow(ConflictError);
	});
});
