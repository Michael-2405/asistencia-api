import { z } from "zod";

export const saveDailyAttendanceSchema = z.object({
	date: z.string().date(),
	records: z
		.array(z.object({ studentId: z.string().uuid(), status: z.enum(["P", "T", "A", "E"]) }))
		.min(1),
});

export type SaveDailyAttendanceInput = z.infer<typeof saveDailyAttendanceSchema>;
