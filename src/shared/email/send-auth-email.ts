import { logger } from "../logger/logger.js";
import { resend } from "./resend.client.js";

const FROM_ADDRESS = "Asistencia MINERD <onboarding@resend.dev>";

export function sendVerificationEmail(to: string, url: string): void {
	void resend.emails
		.send({
			from: FROM_ADDRESS,
			to,
			subject: "Verifica tu correo - Asistencia MINERD",
			html: `<p>Haz clic para verificar tu correo:</p><p><a href="${url}">${url}</a></p>`,
		})
		.catch((error) => logger.error(error, "Failed to send verification email"));
}

export function sendPasswordResetEmail(to: string, url: string): void {
	void resend.emails
		.send({
			from: FROM_ADDRESS,
			to,
			subject: "Restablece tu contraseña - Asistencia MINERD",
			html: `<p>Haz clic para restablecer tu contraseña:</p><p><a href="${url}">${url}</a></p>`,
		})
		.catch((error) => logger.error(error, "Failed to send password reset email"));
}
