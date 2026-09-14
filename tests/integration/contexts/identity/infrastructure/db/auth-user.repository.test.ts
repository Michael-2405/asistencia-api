import { describe, expect, it } from "vitest";
import { user } from "@/contexts/identity/infrastructure/db/auth.schema.js";
import * as authUserRepository from "@/contexts/identity/infrastructure/db/auth-user.repository.js";
import { db } from "@/shared/db/client.js";

describe("auth-user.repository", () => {
	describe("findByEmail", () => {
		it("devuelve el usuario cuando el correo existe", async () => {
			const [inserted] = await db
				.insert(user)
				.values({ id: crypto.randomUUID(), name: "Ana Pérez", email: "ana@example.test" })
				.returning();

			const found = await authUserRepository.findByEmail("ana@example.test");

			expect(found?.id).toBe(inserted.id);
		});

		it("devuelve undefined cuando el correo no existe", async () => {
			const found = await authUserRepository.findByEmail("nadie@example.test");
			expect(found).toBeUndefined();
		});
	});

	describe("deleteById", () => {
		it("elimina el usuario", async () => {
			const [inserted] = await db
				.insert(user)
				.values({ id: crypto.randomUUID(), name: "Ana Pérez", email: "ana@example.test" })
				.returning();

			await authUserRepository.deleteById(inserted.id);

			const found = await authUserRepository.findByEmail("ana@example.test");
			expect(found).toBeUndefined();
		});
	});
});
