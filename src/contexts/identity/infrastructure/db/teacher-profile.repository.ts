import { eq } from "drizzle-orm";
import { subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import { db } from "@/shared/db/client.js";
import { user } from "./auth.schema.js";
import { teacherProfiles } from "./schema.js";

export async function findByUserId(userId: string) {
	const [profile] = await db
		.select()
		.from(teacherProfiles)
		.where(eq(teacherProfiles.userId, userId));
	return profile;
}

export async function findProfileWithUserAndSubject(userId: string) {
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
	return row;
}

export async function insert(values: typeof teacherProfiles.$inferInsert) {
	await db.insert(teacherProfiles).values(values);
}

export async function updateSuspension(
	userId: string,
	values: Pick<typeof teacherProfiles.$inferInsert, "suspendedAt" | "scheduledDeletionAt">,
) {
	await db.update(teacherProfiles).set(values).where(eq(teacherProfiles.userId, userId));
}
