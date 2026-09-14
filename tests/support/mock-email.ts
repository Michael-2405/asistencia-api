import { vi } from "vitest";

// Ningún test debe disparar una llamada real a Resend — se mockea el envío de correo
// globalmente para integration/e2e (Better Auth dispara estos hooks en sign-up/reset).
vi.mock("@/shared/email/send-auth-email.js", () => ({
	sendVerificationEmail: vi.fn(),
	sendPasswordResetEmail: vi.fn(),
}));
