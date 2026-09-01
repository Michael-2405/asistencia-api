import { relations } from "drizzle-orm";
import { date, index, pgSchema, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { courses, students } from "../../../academic/infrastructure/db/schema.js";

export const attendanceSchema = pgSchema("attendance");

// ── Catálogo de estados
export const attendanceStatuses = attendanceSchema.table("attendance_statuses", {
	code: varchar("code", { length: 1 }).primaryKey(),
	name: varchar("name", { length: 30 }).notNull(),
	sortOrder: varchar("sort_order", { length: 2 }).notNull(),
});

// ── Catálogo de razones de excusa
export const excuseReasons = attendanceSchema.table("excuse_reasons", {
	code: varchar("code", { length: 20 }).primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
});

export const attendanceRecords = attendanceSchema.table(
	"attendance_records",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id),
		date: date("date").notNull(),
		eventType: varchar("event_type", { length: 20 }).notNull().default("REGULAR"),
		statusCode: varchar("status_code", { length: 1 })
			.notNull()
			.references(() => attendanceStatuses.code),
		excuseReasonCode: varchar("excuse_reason_code", { length: 20 }).references(
			() => excuseReasons.code,
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("attendance_student_course_date_event_uidx").on(
			table.studentId,
			table.courseId,
			table.date,
			table.eventType,
		),
		index("attendance_course_date_idx").on(table.courseId, table.date),
	],
);

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
	student: one(students, { fields: [attendanceRecords.studentId], references: [students.id] }),
	course: one(courses, { fields: [attendanceRecords.courseId], references: [courses.id] }),
	status: one(attendanceStatuses, {
		fields: [attendanceRecords.statusCode],
		references: [attendanceStatuses.code],
	}),
}));
