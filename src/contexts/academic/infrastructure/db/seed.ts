import { eq, sql } from "drizzle-orm";
import { db } from "../../../../shared/db/client.js";
import {
	courses,
	officialNonInstructionalDays,
	schoolYears,
	students,
	subjects,
} from "./schema.js";

const SUBJECTS = [
	{ name: "Lengua Española", code: "LE", level: "BOTH", isCore: true },
	{ name: "Matemáticas", code: "MAT", level: "BOTH", isCore: true },
	{ name: "Ciencias Sociales", code: "CS", level: "BOTH", isCore: true },
	{ name: "Ciencias Naturales", code: "CN", level: "BOTH", isCore: true },
	{ name: "Educación Física", code: "EF", level: "BOTH", isCore: false },
	{ name: "Educación Artística", code: "EA", level: "BOTH", isCore: false },
	{ name: "Lenguas Extranjeras - Inglés", code: "ING", level: "BOTH", isCore: false },
	{ name: "Lenguas Extranjeras - Francés", code: "FRA", level: "BOTH", isCore: false },
	{ name: "Formación Integral Humana y Religiosa", code: "FIHR", level: "BOTH", isCore: false },
	{ name: "Ciencias de la Naturaleza - Física", code: "FIS", level: "SECONDARY", isCore: false },
	{ name: "Ciencias de la Naturaleza - Química", code: "QIM", level: "SECONDARY", isCore: false },
	{ name: "Salida Optativa", code: "OPT", level: "SECONDARY", isCore: false },
];

// Fechas y motivos ya validados con el calendario oficial MINERD 2026-2027
const OFFICIAL_HOLIDAYS = [
	{ date: "2026-08-16", reason: "Día de la Restauración de la República" },
	{ date: "2026-09-24", reason: "Día de Nuestra Señora de las Mercedes" },
	{ date: "2026-11-09", reason: "Día de la Constitución (trasladado del 6)" },
	{ date: "2027-01-21", reason: "Día de Nuestra Señora de la Altagracia" },
	{ date: "2027-01-25", reason: "Natalicio de Juan Pablo Duarte (trasladado del 26)" },
	{ date: "2027-04-13", reason: "Aniversario ADP" },
	{ date: "2027-02-27", reason: "Día de la Independencia Nacional y Día de la Bandera" },
	{ date: "2027-05-03", reason: "Día del Trabajo (trasladado)" },
	{ date: "2027-05-27", reason: "Corpus Christi" },
];

const OFFICIAL_RANGES = [
	{ start: "2026-12-18", end: "2027-01-06", reason: "Receso navideño" },
	{ start: "2027-03-22", end: "2027-03-26", reason: "Vacaciones de Semana Santa" },
];

const TEST_STUDENTS: [string, string][] = [
	["Ana", "Almonte"],
	["Luis", "Almonte"],
	["Carla", "Bautista"],
	["José", "Contreras"],
	["María", "De la Cruz"],
	["Pedro", "Fernández"],
	["Rosa", "García"],
	["Miguel", "López"],
	["Yolanda", "Martínez"],
	["Carlos", "Peña"],
	["Diana", "Pérez"],
	["Rafael", "Ramírez"],
	["Sofía", "Reyes"],
	["Julio", "Santana"],
	["Elena", "Vargas"],
	["Manuel", "Acosta"],
	["Katherine", "Aquino"],
	["Franklin", "Batista"],
	["Yesenia", "Cabrera"],
	["Wilson", "Castillo"],
	["Estefany", "Cruz"],
	["Alexander", "Díaz"],
	["Gabriela", "Duarte"],
	["Héctor", "Espinal"],
	["Nicole", "Feliz"],
	["Anderson", "Guzmán"],
	["Paola", "Jiménez"],
	["Kevin", "Mercedes"],
	["Luisa", "Mejía"],
	["Braulio", "Núñez"],
	["Camila", "Ortiz"],
	["Danilo", "Paulino"],
	["Fernanda", "Rosario"],
	["Ismael", "Tavárez"],
	["Wendy", "Ureña"],
];

export async function seedAcademicCatalogs() {
	await db.insert(subjects).values(SUBJECTS).onConflictDoNothing();
}

export async function seedSchoolYear() {
	const [existing] = await db.select().from(schoolYears).where(eq(schoolYears.name, "2026-2027"));
	if (existing) return existing;

	const [created] = await db
		.insert(schoolYears)
		.values({ name: "2026-2027", startDate: "2026-08-24", endDate: "2027-06-18" })
		.returning();

	return created;
}

export async function seedOfficialCalendar(schoolYearId: string) {
	const singleDays = OFFICIAL_HOLIDAYS.map((h) => ({
		schoolYearId,
		date: h.date,
		reason: h.reason,
	}));
	await db.insert(officialNonInstructionalDays).values(singleDays).onConflictDoNothing();

	for (const range of OFFICIAL_RANGES) {
		const rangeDays = await db.execute(sql`
			SELECT gs::date::text AS date
			FROM generate_series(${range.start}::date, ${range.end}::date, interval '1 day') AS gs
			WHERE EXTRACT(ISODOW FROM gs) < 6
		`);

		const values = rangeDays.rows.map((row) => ({
			schoolYearId,
			date: row.date as string,
			reason: range.reason,
		}));

		await db.insert(officialNonInstructionalDays).values(values).onConflictDoNothing();
	}
}

export async function seedTestCourseAndStudents(teacherUserId: string, schoolYearId: string) {
	const [existingCourse] = await db.select().from(courses).where(eq(courses.userId, teacherUserId));

	if (existingCourse) {
		console.log("El curso de prueba ya existía, se omite");
		return;
	}

	const [course] = await db
		.insert(courses)
		.values({
			userId: teacherUserId,
			schoolYearId,
			grade: "6to",
			section: "A",
			educationLevel: "PRIMARY",
			isHomeroom: true,
			subjectId: null,
		})
		.returning();

	const sorted = [...TEST_STUDENTS].sort((a, b) =>
		`${a[1]} ${a[0]}`.localeCompare(`${b[1]} ${b[0]}`, "es"),
	);

	const values = sorted.map(([firstName, firstLastname], index) => ({
		courseId: course.id,
		orderNumber: index + 1,
		firstName,
		firstLastname,
	}));

	await db.insert(students).values(values);
}
