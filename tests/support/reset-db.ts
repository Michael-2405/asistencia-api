import { sql } from "drizzle-orm";
import { db } from "@/shared/db/client.js";

const APP_SCHEMAS = ["identity", "academic", "attendance", "auth"];

// Catálogos de referencia sembrados una sola vez por contenedor (ver postgres-container.ts) —
// no son datos de un test, se conservan entre tests igual que el resultado de las migraciones.
const CATALOG_TABLES = ["attendance_statuses", "excuse_reasons"];

export async function resetDatabase() {
	const { rows } = await db.execute(sql`
		SELECT schemaname, tablename FROM pg_tables
		WHERE schemaname IN ${APP_SCHEMAS} AND tablename NOT IN ${CATALOG_TABLES}
	`);

	const tables = (rows as { schemaname: string; tablename: string }[]).map(
		(r) => sql`${sql.identifier(r.schemaname)}.${sql.identifier(r.tablename)}`,
	);

	if (tables.length === 0) return;

	await db.execute(sql`TRUNCATE TABLE ${sql.join(tables, sql`, `)} CASCADE`);
}
