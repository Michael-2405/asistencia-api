import { ConflictError } from "@/shared/errors/app-error.js";
import type { CreateSchoolYearInput } from "../domain/create-school-year.schema.js";
import * as schoolYearsRepository from "../infrastructure/db/school-years.repository.js";

export async function createSchoolYear(input: CreateSchoolYearInput) {
	const overlapping = await schoolYearsRepository.findOverlapping(input.startDate, input.endDate);

	if (overlapping.length > 0) {
		throw new ConflictError(
			`El rango de fechas se superpone con el año escolar "${overlapping[0].name}"`,
		);
	}

	try {
		const schoolYear = await schoolYearsRepository.insert(input);
		return schoolYear;
	} catch (error) {
		if (isPgUniqueViolation(error)) {
			throw new ConflictError(`Ya existe un año escolar con el nombre "${input.name}"`);
		}
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	const pgError = error instanceof Error && error.cause ? error.cause : error;
	return (
		typeof pgError === "object" && pgError !== null && "code" in pgError && pgError.code === "23505"
	);
}
