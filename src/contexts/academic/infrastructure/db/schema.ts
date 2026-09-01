import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	pgSchema,
	smallint,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "../../../identity/infrastructure/db/auth.schema.js";

export const academicSchema = pgSchema("academic");

// Catálogo de materia
export const subjects = academicSchema.table("subjects", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 150 }).notNull().unique(),
	code: varchar("code", { length: 10 }).notNull().unique(),
	level: varchar("level", { length: 20 }).notNull(),
	isCore: boolean("is_core").notNull().default(false),
	active: boolean("active").notNull().default(true),
});

// Año escolar
export const schoolYears = academicSchema.table("school_years", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 9 }).notNull().unique(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
});

// Días no lectivos
export const officialNonInstructionalDays = academicSchema.table(
	"official_non_instructional_days",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		schoolYearId: uuid("school_year_id")
			.notNull()
			.references(() => schoolYears.id),
		date: date("date").notNull(),
		reason: varchar("reason", { length: 150 }),
	},
	(table) => [
		unique("official_non_instr_school_year_date_uidx").on(table.schoolYearId, table.date),
	],
);

// Cursos
export const courses = academicSchema.table(
	"courses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		schoolYearId: uuid("school_year_id")
			.notNull()
			.references(() => schoolYears.id),
		grade: varchar("grade", { length: 20 }).notNull(),
		section: varchar("section", { length: 5 }).notNull(),
		educationLevel: varchar("education_level", { length: 20 }).notNull(),
		isHomeroom: boolean("is_homeroom").notNull().default(false),
		subjectId: uuid("subject_id").references(() => subjects.id),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("courses_user_year_grade_section_subject_uidx").on(
			table.userId,
			table.schoolYearId,
			table.grade,
			table.section,
			table.subjectId,
		),
		index("courses_user_year_idx").on(table.userId, table.schoolYearId),
	],
);

// Días no laborables
export const courseNonInstructionalDays = academicSchema.table(
	"course_non_instructional_days",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id),
		date: date("date").notNull(),
		reason: varchar("reason", { length: 150 }),
	},
	(table) => [unique("course_non_instr_course_date_uidx").on(table.courseId, table.date)],
);

// Estudiantes
export const students = academicSchema.table(
	"students",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id),
		orderNumber: smallint("order_number").notNull(),
		firstName: varchar("first_name", { length: 100 }).notNull(),
		secondName: varchar("second_name", { length: 100 }),
		firstLastname: varchar("first_lastname", { length: 100 }).notNull(),
		secondLastname: varchar("second_lastname", { length: 100 }),
		birthDate: date("birth_date"),
		sex: varchar("sex", { length: 1 }),
		active: boolean("active").notNull().default(true),
		withdrawalDate: date("withdrawal_date"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("students_course_order_uidx").on(table.courseId, table.orderNumber),
		index("students_course_active_idx").on(table.courseId, table.active),
	],
);

export const coursesRelations = relations(courses, ({ one, many }) => ({
	schoolYear: one(schoolYears, { fields: [courses.schoolYearId], references: [schoolYears.id] }),
	subject: one(subjects, { fields: [courses.subjectId], references: [subjects.id] }),
	students: many(students),
}));

export const studentsRelations = relations(students, ({ one }) => ({
	course: one(courses, { fields: [students.courseId], references: [courses.id] }),
}));
