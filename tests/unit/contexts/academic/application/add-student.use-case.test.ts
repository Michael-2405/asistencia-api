import { beforeEach, describe, expect, it, vi } from "vitest";
import { addStudent } from "@/contexts/academic/application/add-student.use-case.js";
import * as studentsRepository from "@/contexts/academic/infrastructure/db/students.repository.js";
import { assertCourseOwnership } from "@/contexts/academic/utils/assert-course-ownership.js";

vi.mock("@/contexts/academic/infrastructure/db/students.repository.js", () => ({
	findLastOrderNumber: vi.fn(),
	insert: vi.fn(),
}));
vi.mock("@/contexts/academic/utils/assert-course-ownership.js", () => ({
	assertCourseOwnership: vi.fn(),
}));

const input = {
	firstName: "Ana",
	firstLastname: "Pérez",
};

describe("addStudent", () => {
	beforeEach(() => {
		vi.mocked(studentsRepository.findLastOrderNumber).mockReset();
		vi.mocked(studentsRepository.insert).mockReset();
		vi.mocked(assertCourseOwnership).mockReset();
		vi.mocked(assertCourseOwnership).mockResolvedValue({ id: "course-1" } as never);
	});

	it("asigna el siguiente número de orden a partir del último existente", async () => {
		vi.mocked(studentsRepository.findLastOrderNumber).mockResolvedValue(4);
		vi.mocked(studentsRepository.insert).mockResolvedValue({ id: "student-1" } as never);

		await addStudent("user-1", "course-1", input);

		expect(studentsRepository.insert).toHaveBeenCalledWith(
			expect.objectContaining({ orderNumber: 5 }),
		);
	});

	it("empieza en el número de orden 1 cuando no hay estudiantes previos", async () => {
		vi.mocked(studentsRepository.findLastOrderNumber).mockResolvedValue(undefined);
		vi.mocked(studentsRepository.insert).mockResolvedValue({ id: "student-1" } as never);

		await addStudent("user-1", "course-1", input);

		expect(studentsRepository.insert).toHaveBeenCalledWith(
			expect.objectContaining({ orderNumber: 1 }),
		);
	});

	it("reintenta con el siguiente número de orden si hay una colisión de unicidad", async () => {
		vi.mocked(studentsRepository.findLastOrderNumber).mockResolvedValue(4);
		vi.mocked(studentsRepository.insert)
			.mockRejectedValueOnce({ code: "23505" })
			.mockResolvedValueOnce({ id: "student-1" } as never);

		const result = await addStudent("user-1", "course-1", input);

		expect(result).toEqual({ id: "student-1" });
		expect(studentsRepository.insert).toHaveBeenCalledTimes(2);
	});

	it("propaga el error tras agotar los reintentos por colisiones de unicidad", async () => {
		vi.mocked(studentsRepository.findLastOrderNumber).mockResolvedValue(4);
		vi.mocked(studentsRepository.insert).mockRejectedValue({ code: "23505" });

		await expect(addStudent("user-1", "course-1", input)).rejects.toBeTruthy();
		expect(studentsRepository.insert).toHaveBeenCalledTimes(3);
	});
});
