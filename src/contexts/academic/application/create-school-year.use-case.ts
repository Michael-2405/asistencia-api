import { and, gte, lte } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ConflictError } from "@/shared/errors/app-error.js";
import type { CreateSchoolYearInput } from "../domain/create-school-year.schema.js";
import { schoolYears } from "../infrastructure/db/schema.js";

export async function createSchoolYear(input: CreateSchoolYearInput) {
	const overlapping = await db
		.select({ id: schoolYears.id, name: schoolYears.name })
		.from(schoolYears)
		.where(
			and(lte(schoolYears.startDate, input.endDate), gte(schoolYears.endDate, input.startDate)),
		);

	if (overlapping.length > 0) {
		throw new ConflictError(
			`El rango de fechas se superpone con el año escolar "${overlapping[0].name}"`,
		);
	}

	try {
		const [schoolYear] = await db.insert(schoolYears).values(input).returning();
		return schoolYear;
	} catch (error) {
		if (isPgUniqueViolation(error)) {
			throw new ConflictError(`Ya existe un año escolar con el nombre "${input.name}"`);
		}
		throw error;
	}
}

function isPgUniqueViolation(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
