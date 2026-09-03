import { and, gte, lte } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { schoolYears } from "../infrastructure/db/schema.js";

export async function getCurrentSchoolYear() {
	const today = new Date().toISOString().split("T")[0];

	const [current] = await db
		.select()
		.from(schoolYears)
		.where(and(lte(schoolYears.startDate, today), gte(schoolYears.endDate, today)));

	if (!current) {
		throw new NotFoundError("No hay un año escolar activo actualmente");
	}

	return current;
}
