import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { ValidationError } from "@/shared/errors/app-error.js";
import { auth } from "../infrastructure/auth/auth.config.js";

export async function verifyPassword(password: string, headers: IncomingHttpHeaders) {
	try {
		await auth.api.verifyPassword({ body: { password }, headers: fromNodeHeaders(headers) });
	} catch {
		throw new ValidationError("Contraseña incorrecta");
	}
}
