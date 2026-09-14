import * as subjectsRepository from "../infrastructure/db/subjects.repository.js";

export function listSubjects() {
	return subjectsRepository.findAll();
}
