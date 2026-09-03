import { z } from "zod";

export const markCourseNonInstructionalDaySchema = z.object({
	date: z.string().date(),
	reason: z.string().max(150).optional(),
});

export type MarkCourseNonInstructionalDayInput = z.infer<
	typeof markCourseNonInstructionalDaySchema
>;
