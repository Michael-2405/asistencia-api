import { NotFoundError } from "../../../shared/errors/app-error.js";
import * as schoolYearsRepository from "../infrastructure/db/school-years.repository.js";

export async function getCurrentSchoolYear() {
	const today = new Date().toISOString().split("T")[0];

	const current = await schoolYearsRepository.findCurrent(today);

	if (!current) {
		throw new NotFoundError("No hay un año escolar activo actualmente");
	}

	return current;
}
