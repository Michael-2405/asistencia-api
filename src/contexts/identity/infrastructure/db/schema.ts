import { relations } from "drizzle-orm";
import { boolean, pgSchema, text, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth.schema.js";

export const identitySchema = pgSchema("identity");

export const teacherProfiles = identitySchema.table("teacher_profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	educationLevel: varchar("education_level", { length: 20 }).notNull(),
	isHomeroomTeacher: boolean("is_homeroom_teacher").notNull().default(false),
	subjectId: uuid("subject_id"),
});

export const teacherProfileRelations = relations(teacherProfiles, ({ one }) => ({
	user: one(user, {
		fields: [teacherProfiles.userId],
		references: [user.id],
	}),
}));
