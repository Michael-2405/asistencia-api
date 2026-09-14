import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { registerAndAuthenticate } from "../../../support/auth.js";

// suspendAccount revoca TODAS las sesiones del usuario (Better Auth revokeSessions),
// incluida la que hizo el propio request de suspensión — así que para probar el flujo
// "autenticado pero suspendido" hay que iniciar sesión de nuevo después de suspender,
// tal como lo haría un docente suspendido que vuelve a entrar.
async function reSignIn(
	agent: ReturnType<typeof supertest.agent>,
	email: string,
	password: string,
) {
	await agent.post("/api/auth/sign-in/email").send({ email, password });
}

const registerBody = {
	fullName: "Ana Pérez",
	email: "ana@example.test",
	password: "password123",
	educationLevel: "PRIMARY" as const,
	isHomeroomTeacher: true,
};

describe("POST /teachers/register", () => {
	it("registra un nuevo docente", async () => {
		const response = await supertest(app).post("/teachers/register").send(registerBody);

		expect(response.status).toBe(201);
		expect(response.body.data.userId).toBeDefined();
	});

	it("devuelve conflicto si el correo ya está registrado", async () => {
		await supertest(app).post("/teachers/register").send(registerBody);

		const response = await supertest(app).post("/teachers/register").send(registerBody);

		expect(response.status).toBe(409);
	});

	it("devuelve error de validación con datos incompletos", async () => {
		const response = await supertest(app)
			.post("/teachers/register")
			.send({ ...registerBody, password: "short" });

		expect(response.status).toBe(400);
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
	});
});

describe("GET /teachers/me", () => {
	it("rechaza la petición sin sesión autenticada", async () => {
		const response = await supertest(app).get("/teachers/me");
		expect(response.status).toBe(401);
	});

	it("devuelve el perfil del docente autenticado", async () => {
		const { agent, email } = await registerAndAuthenticate();

		const response = await agent.get("/teachers/me");

		expect(response.status).toBe(200);
		expect(response.body.data.email).toBe(email);
	});
});

describe("POST /teachers/me/suspend y /teachers/me/reactivate", () => {
	it("rechaza la suspensión con contraseña incorrecta", async () => {
		const { agent } = await registerAndAuthenticate({ password: "password123" });

		const response = await agent.post("/teachers/me/suspend").send({ password: "incorrecta" });

		expect(response.status).toBe(400);
	});

	it("suspende la cuenta, revoca la sesión actual, y bloquea el acceso a otras rutas protegidas con una sesión nueva", async () => {
		const { agent, email } = await registerAndAuthenticate({ password: "password123" });

		const suspendResponse = await agent
			.post("/teachers/me/suspend")
			.send({ password: "password123" });
		expect(suspendResponse.status).toBe(200);

		const revokedSessionAttempt = await agent.get("/courses");
		expect(revokedSessionAttempt.status).toBe(401);

		await reSignIn(agent, email, "password123");
		const profileAttempt = await agent.get("/courses");
		expect(profileAttempt.status).toBe(403);
		expect(profileAttempt.body.error.code).toBe("ACCOUNT_SUSPENDED");
	});

	it("no permite suspender una cuenta ya suspendida", async () => {
		const { agent, email } = await registerAndAuthenticate({ password: "password123" });
		await agent.post("/teachers/me/suspend").send({ password: "password123" });
		await reSignIn(agent, email, "password123");

		const response = await agent.post("/teachers/me/suspend").send({ password: "password123" });

		expect(response.status).toBe(409);
	});

	it("reactiva la cuenta suspendida con la contraseña correcta", async () => {
		const { agent, email } = await registerAndAuthenticate({ password: "password123" });
		await agent.post("/teachers/me/suspend").send({ password: "password123" });
		await reSignIn(agent, email, "password123");

		const response = await agent.post("/teachers/me/reactivate").send({ password: "password123" });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ reactivated: true });

		const afterReactivation = await agent.get("/courses");
		expect(afterReactivation.status).not.toBe(403);
	});

	it("rechaza reactivar una cuenta que no está suspendida", async () => {
		const { agent } = await registerAndAuthenticate({ password: "password123" });

		const response = await agent.post("/teachers/me/reactivate").send({ password: "password123" });

		expect(response.status).toBe(400);
	});
});
