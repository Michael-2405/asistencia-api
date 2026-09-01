export interface ApiSuccessResponse<T> {
	status: "success";
	data: T;
	message?: string;
	meta?: PaginationMeta;
}

export interface PaginationMeta {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface ApiErrorResponse {
	status: "error";
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}
