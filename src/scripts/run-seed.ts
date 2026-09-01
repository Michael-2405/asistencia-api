import {
	seedAcademicCatalogs,
	seedOfficialCalendar,
	seedSchoolYear,
	seedTestCourseAndStudents,
} from "@/contexts/academic/infrastructure/db/seed.js";
import { seedAttendanceCatalogs } from "@/contexts/attendance/infrastructure/db/seed.js";

const TEACHER_USER_ID = process.argv[2];

async function main() {
	console.log("Sembrando catálogos de asistencia (estados, razones de excusa)...");
	await seedAttendanceCatalogs();

	console.log("Sembrando catálogos académicos (materias)...");
	await seedAcademicCatalogs();

	console.log("Sembrando año escolar + calendario oficial...");
	const schoolYear = await seedSchoolYear();
	await seedOfficialCalendar(schoolYear.id);

	if (TEACHER_USER_ID) {
		console.log("Sembrando curso + 35 estudiantes de prueba...");
		await seedTestCourseAndStudents(TEACHER_USER_ID, schoolYear.id);
	} else {
		console.log("Sin teacherUserId — se omite el seed de curso/estudiantes.");
		console.log("Corre de nuevo con: npm run seed -- <teacherUserId>");
	}

	console.log("Listo.");
	process.exit(0);
}

main().catch((error) => {
	console.error("Seed falló:", error);
	process.exit(1);
});
