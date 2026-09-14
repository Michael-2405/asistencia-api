import { courseNonInstructionalDays } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";

// Escribe en academic.course_non_instructional_days — deuda documentada en TECH_DEBT.md.
export async function insert(values: typeof courseNonInstructionalDays.$inferInsert) {
	const [day] = await db.insert(courseNonInstructionalDays).values(values).returning();
	return day;
}
