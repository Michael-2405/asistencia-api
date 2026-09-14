import { env } from "@/shared/config/env.js";
import { logger } from "@/shared/logger/logger.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
	logger.info(`API listening on http://localhost:${env.PORT}`);
});
