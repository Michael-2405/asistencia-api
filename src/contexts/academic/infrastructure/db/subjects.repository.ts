import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { subjects } from "./schema.js";

export function findAll() {
	return db.select().from(subjects);
}

export async function findById(id: string) {
	const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
	return subject;
}
