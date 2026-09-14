import { beforeEach, describe, expect, it, vi } from "vitest";
import { cloneCourses } from "@/contexts/academic/application/clone-courses.use-case.js";
import * as coursesRepository from "@/contexts/academic/infrastructure/db/courses.repository.js";
import { getCurrentSchoolYear } from "@/contexts/academic/utils/get-current-school-year.js";

vi.mock("@/contexts/academic/infrastructure/db/courses.repository.js", () => ({
	findManyByUserYearAndIds: vi.fn(),
	insert: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/get-current-school-year.js", () => ({
	getCurrentSchoolYear: vi.fn(),
}));

const source = (id: string) => ({
	id,
	grade: "3",
	section: "A",
	educationLevel: "PRIMARY",
	isHomeroom: true,
	subjectId: null,
});

describe("cloneCourses", () => {
	beforeEach(() => {
		vi.mocked(coursesRepository.findManyByUserYearAndIds).mockReset();
		vi.mocked(coursesRepository.insert).mockReset();
		vi.mocked(getCurrentSchoolYear).mockReset();
		vi.mocked(getCurrentSchoolYear).mockResolvedValue({ id: "sy-target" } as never);
	});

	it("clona cada curso fuente hacia el año escolar activo", async () => {
		vi.mocked(coursesRepository.findManyByUserYearAndIds).mockResolvedValue([
			source("course-1"),
			source("course-2"),
		] as never);
		vi.mocked(coursesRepository.insert).mockImplementation(
			async (values) => ({ id: "new", ...values }) as never,
		);

		const result = await cloneCourses("user-1", {
			sourceSchoolYearId: "sy-source",
			courseIds: ["course-1", "course-2"],
		});

		expect(result.createdCount).toBe(2);
		expect(result.skippedCount).toBe(0);
		expect(coursesRepository.insert).toHaveBeenCalledTimes(2);
	});

	it("cuenta como salteado un curso que ya existe en el año destino (violación de unicidad)", async () => {
		vi.mocked(coursesRepository.findManyByUserYearAndIds).mockResolvedValue([
			source("course-1"),
		] as never);
		vi.mocked(coursesRepository.insert).mockRejectedValue({ code: "23505" });

		const result = await cloneCourses("user-1", {
			sourceSchoolYearId: "sy-source",
			courseIds: ["course-1"],
		});

		expect(result.createdCount).toBe(0);
		expect(result.skippedCount).toBe(1);
		expect(result.created).toEqual([]);
	});

	it("propaga un error que no es violación de unicidad", async () => {
		vi.mocked(coursesRepository.findManyByUserYearAndIds).mockResolvedValue([
			source("course-1"),
		] as never);
		vi.mocked(coursesRepository.insert).mockRejectedValue(new Error("db down"));

		await expect(
			cloneCourses("user-1", { sourceSchoolYearId: "sy-source", courseIds: ["course-1"] }),
		).rejects.toThrow("db down");
	});
});
