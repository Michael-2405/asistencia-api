import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { ValidationError } from "@/shared/errors/app-error.js";
import { subjects } from "../infrastructure/db/schema.js";

export async function assertSubjectMatchesLevel(
	subjectId: string,
	educationLevel: "PRIMARY" | "SECONDARY",
) {
	const [subject] = await db
		.select({ level: subjects.level })
		.from(subjects)
		.where(eq(subjects.id, subjectId));

	if (!subject) {
		throw new ValidationError("La materia seleccionada no existe");
	}

	if (subject.level !== "BOTH" && subject.level !== educationLevel) {
		throw new ValidationError("La materia seleccionada no corresponde al nivel educativo indicado");
	}
}
