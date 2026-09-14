import { NotFoundError } from "@/shared/errors/app-error.js";
import * as teacherProfileRepository from "../infrastructure/db/teacher-profile.repository.js";

export async function getMyProfile(userId: string) {
	const row = await teacherProfileRepository.findProfileWithUserAndSubject(userId);

	if (!row) throw new NotFoundError("Perfil no encontrado");
	return row;
}
