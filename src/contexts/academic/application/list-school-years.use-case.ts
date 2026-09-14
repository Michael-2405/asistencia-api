import * as schoolYearsRepository from "../infrastructure/db/school-years.repository.js";

export function listSchoolYears() {
	return schoolYearsRepository.findAllOrderedByStartDateDesc();
}
