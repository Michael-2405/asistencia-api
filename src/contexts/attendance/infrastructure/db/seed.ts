import { db } from "../../../../shared/db/client.js";
import { attendanceStatuses, excuseReasons } from "./schema.js";

export async function seedAttendanceCatalogs() {
	await db
		.insert(attendanceStatuses)
		.values([
			{ code: "P", name: "Presente", sortOrder: "1" },
			{ code: "T", name: "Tardanza", sortOrder: "2" },
			{ code: "A", name: "Ausente", sortOrder: "3" },
			{ code: "E", name: "Excusa", sortOrder: "4" },
		])
		.onConflictDoNothing();

	await db
		.insert(excuseReasons)
		.values([
			{ code: "ILLNESS", name: "Enfermedad" },
			{ code: "ACCIDENT", name: "Accidente" },
			{ code: "BEREAVEMENT", name: "Duelo" },
			{ code: "FORCE_MAJEURE", name: "Fuerza mayor" },
		])
		.onConflictDoNothing();
}
