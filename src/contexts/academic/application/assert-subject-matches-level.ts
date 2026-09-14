import { ValidationError } from "@/shared/errors/app-error.js";
import * as subjectsRepository from "../infrastructure/db/subjects.repository.js";

export async function assertSubjectMatchesLevel(
	subjectId: string,
	educationLevel: "PRIMARY" | "SECONDARY",
) {
	const subject = await subjectsRepository.findById(subjectId);

	if (!subject) {
		throw new ValidationError("La materia seleccionada no existe");
	}

	if (subject.level !== "BOTH" && subject.level !== educationLevel) {
		throw new ValidationError("La materia seleccionada no corresponde al nivel educativo indicado");
	}
}
