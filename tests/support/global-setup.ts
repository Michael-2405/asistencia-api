import { startTestDatabase } from "./postgres-container.js";

export default async function setup() {
	const { container, connectionUri } = await startTestDatabase();

	process.env.DATABASE_URL = connectionUri;
	process.env.BETTER_AUTH_URL = "http://localhost:3000";
	process.env.RESEND_API_KEY = "test-resend-api-key";
	process.env.CORS_ORIGIN = "http://localhost:5173";
	process.env.PORT = "0";
	process.env.NODE_ENV = "test";

	return async () => {
		await container.stop();
	};
}
