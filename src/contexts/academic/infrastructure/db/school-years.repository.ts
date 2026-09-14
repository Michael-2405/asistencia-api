import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import type { CreateSchoolYearInput } from "../../domain/create-school-year.schema.js";
import { schoolYears } from "./schema.js";

export function findAllOrderedByStartDateDesc() {
	return db.select().from(schoolYears).orderBy(desc(schoolYears.startDate));
}

export function findOverlapping(startDate: string, endDate: string) {
	return db
		.select({ id: schoolYears.id, name: schoolYears.name })
		.from(schoolYears)
		.where(and(lte(schoolYears.startDate, endDate), gte(schoolYears.endDate, startDate)));
}

export async function findCurrent(today: string) {
	const [current] = await db
		.select()
		.from(schoolYears)
		.where(and(lte(schoolYears.startDate, today), gte(schoolYears.endDate, today)));
	return current;
}

export async function insert(input: CreateSchoolYearInput) {
	const [schoolYear] = await db.insert(schoolYears).values(input).returning();
	return schoolYear;
}
