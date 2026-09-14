import { eq } from "drizzle-orm";
import supertest from "supertest";
import { app } from "@/app.js";
import { user } from "@/contexts/identity/infrastructure/db/auth.schema.js";
import { db } from "@/shared/db/client.js";

type RegisterOverrides = Partial<{
	fullName: string;
	email: string;
	password: string;
	educationLevel: "PRIMARY" | "SECONDARY";
	isHomeroomTeacher: boolean;
	subjectId: string;
}>;

// Better Auth requiere verificación de correo antes de emitir sesión (requireEmailVerification: true),
// así que para tests marcamos el correo como verificado directo en la base en vez de simular el flujo de email real.
export async function registerAndAuthenticate(overrides?: RegisterOverrides) {
	const email = overrides?.email ?? `teacher-${crypto.randomUUID()}@example.test`;
	const password = overrides?.password ?? "password123";

	const agent = supertest.agent(app);

	const registerRes = await agent.post("/teachers/register").send({
		fullName: overrides?.fullName ?? "Docente de Prueba",
		email,
		password,
		educationLevel: overrides?.educationLevel ?? "PRIMARY",
		isHomeroomTeacher: overrides?.isHomeroomTeacher ?? true,
		...(overrides?.subjectId ? { subjectId: overrides.subjectId } : {}),
	});

	if (registerRes.status !== 201) {
		throw new Error(
			`No se pudo registrar el docente de prueba: ${JSON.stringify(registerRes.body)}`,
		);
	}

	await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));

	const signInRes = await agent.post("/api/auth/sign-in/email").send({ email, password });

	if (signInRes.status !== 200) {
		throw new Error(
			`No se pudo iniciar sesión del docente de prueba: ${JSON.stringify(signInRes.body)}`,
		);
	}

	return { agent, userId: registerRes.body.data.userId as string, email };
}
