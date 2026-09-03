import { eq } from "drizzle-orm";
import { subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { NotFoundError } from "@/shared/errors/app-error.js";
import { user } from "../infrastructure/db/auth.schema.js";
import { teacherProfiles } from "../infrastructure/db/schema.js";

export async function getMyProfile(userId: string) {
	const [row] = await db
		.select({
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			twoFactorEnabled: user.twoFactorEnabled,
			educationLevel: teacherProfiles.educationLevel,
			isHomeroomTeacher: teacherProfiles.isHomeroomTeacher,
			subjectName: subjects.name,
			suspendedAt: teacherProfiles.suspendedAt,
			scheduledDeletionAt: teacherProfiles.scheduledDeletionAt,
		})
		.from(teacherProfiles)
		.innerJoin(user, eq(user.id, teacherProfiles.userId))
		.leftJoin(subjects, eq(teacherProfiles.subjectId, subjects.id))
		.where(eq(teacherProfiles.userId, userId));

	if (!row) throw new NotFoundError("Perfil no encontrado");
	return row;
}
