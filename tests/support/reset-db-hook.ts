import { beforeEach } from "vitest";
import { resetDatabase } from "./reset-db.js";

beforeEach(async () => {
	await resetDatabase();
});
