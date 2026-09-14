import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { user } from "./auth.schema.js";

export async function findByEmail(email: string) {
	const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	return row;
}

export async function deleteById(userId: string) {
	await db.delete(user).where(eq(user.id, userId));
}
