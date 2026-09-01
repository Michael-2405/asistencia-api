import type { Response } from "express";
import type { ApiSuccessResponse, PaginationMeta } from "./api-response.js";

export function respondSuccess<T>(
	res: Response,
	data: T,
	options?: { statusCode?: number; message?: string; meta?: PaginationMeta },
) {
	const body: ApiSuccessResponse<T> = {
		status: "success",
		data,
		...(options?.message ? { message: options.message } : {}),
		...(options?.meta ? { meta: options.meta } : {}),
	};

	res.status(options?.statusCode ?? 200).json(body);
}
