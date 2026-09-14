import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import {
	attendanceStatuses,
	excuseReasons,
} from "@/contexts/attendance/infrastructure/db/schema.js";

export async function startTestDatabase() {
	const container = await new PostgreSqlContainer("postgres:17-alpine").start();
	const connectionUri = container.getConnectionUri();

	const pool = new Pool({ connectionString: connectionUri });
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder: "./drizzle" });

	// Catálogos que normalmente siembra `npm run seed` (src/scripts/run-seed.ts), no las
	// migraciones — necesarios porque attendance_records.status_code tiene FK a esta tabla.
	await db.insert(attendanceStatuses).values([
		{ code: "P", name: "Presente", sortOrder: "1" },
		{ code: "T", name: "Tardanza", sortOrder: "2" },
		{ code: "A", name: "Ausente", sortOrder: "3" },
		{ code: "E", name: "Excusa", sortOrder: "4" },
	]);
	await db.insert(excuseReasons).values([
		{ code: "ILLNESS", name: "Enfermedad" },
		{ code: "ACCIDENT", name: "Accidente" },
		{ code: "BEREAVEMENT", name: "Duelo" },
		{ code: "FORCE_MAJEURE", name: "Fuerza mayor" },
	]);

	await pool.end();

	return { container, connectionUri };
}
