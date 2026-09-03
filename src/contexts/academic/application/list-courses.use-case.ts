import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client.js";
import { courses } from "../infrastructure/db/schema.js";

export async function listCourses(userId: string) {
	return db.select().from(courses).where(eq(courses.id, userId));
}
