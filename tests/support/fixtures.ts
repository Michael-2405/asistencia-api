import { user } from "@/contexts/identity/infrastructure/db/auth.schema.js";
import { db } from "@/shared/db/client.js";

// Inserta un usuario mínimo de auth.user directo, sin pasar por Better Auth —
// solo para satisfacer FKs (courses.userId, teacher_profiles.userId) en tests de repositorio.
export async function insertTestUser() {
	const [inserted] = await db
		.insert(user)
		.values({
			id: crypto.randomUUID(),
			name: "Docente de Prueba",
			email: `user-${crypto.randomUUID()}@example.test`,
		})
		.returning();
	return inserted;
}
