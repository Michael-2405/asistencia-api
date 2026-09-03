import { z } from "zod";

export const cloneCoursesSchema = z.object({
	sourceSchoolYearId: z.string().uuid(),
	courseIds: z.array(z.string().uuid()).min(1),
});

export type CloneCoursesInput = z.infer<typeof cloneCoursesSchema>;
