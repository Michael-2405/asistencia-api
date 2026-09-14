import { describe, expect, it } from "vitest";
import { subjects } from "@/contexts/academic/infrastructure/db/schema.js";
import * as teacherProfileRepository from "@/contexts/identity/infrastructure/db/teacher-profile.repository.js";
import { db } from "@/shared/db/client.js";
import { insertTestUser } from "../../../../../support/fixtures.js";

describe("teacher-profile.repository", () => {
	describe("insert / findByUserId", () => {
		it("inserta un perfil y lo puede volver a leer por userId", async () => {
			const user = await insertTestUser();

			await teacherProfileRepository.insert({
				userId: user.id,
				educationLevel: "PRIMARY",
				isHomeroomTeacher: true,
			});

			const profile = await teacherProfileRepository.findByUserId(user.id);

			expect(profile?.educationLevel).toBe("PRIMARY");
			expect(profile?.suspendedAt).toBeNull();
		});

		it("devuelve undefined si no hay perfil para ese userId", async () => {
			const profile = await teacherProfileRepository.findByUserId("no-such-user");
			expect(profile).toBeUndefined();
		});
	});

	describe("findProfileWithUserAndSubject", () => {
		it("devuelve el perfil combinado con los datos del usuario y el nombre de la materia", async () => {
			const user = await insertTestUser();
			const [subject] = await db
				.insert(subjects)
				.values({ name: "Matemática", code: "MAT", level: "SECONDARY", isCore: true })
				.returning();

			await teacherProfileRepository.insert({
				userId: user.id,
				educationLevel: "SECONDARY",
				isHomeroomTeacher: false,
				subjectId: subject.id,
			});

			const row = await teacherProfileRepository.findProfileWithUserAndSubject(user.id);

			expect(row?.email).toBe(user.email);
			expect(row?.subjectName).toBe("Matemática");
		});

		it("devuelve subjectName null cuando el docente no tiene materia asignada", async () => {
			const user = await insertTestUser();
			await teacherProfileRepository.insert({
				userId: user.id,
				educationLevel: "PRIMARY",
				isHomeroomTeacher: true,
			});

			const row = await teacherProfileRepository.findProfileWithUserAndSubject(user.id);

			expect(row?.subjectName).toBeNull();
		});
	});

	describe("updateSuspension", () => {
		it("actualiza suspendedAt y scheduledDeletionAt", async () => {
			const user = await insertTestUser();
			await teacherProfileRepository.insert({
				userId: user.id,
				educationLevel: "PRIMARY",
				isHomeroomTeacher: true,
			});

			const suspendedAt = new Date();
			const scheduledDeletionAt = new Date();
			await teacherProfileRepository.updateSuspension(user.id, {
				suspendedAt,
				scheduledDeletionAt,
			});

			const profile = await teacherProfileRepository.findByUserId(user.id);
			expect(profile?.suspendedAt).not.toBeNull();
			expect(profile?.scheduledDeletionAt).not.toBeNull();
		});
	});
});
