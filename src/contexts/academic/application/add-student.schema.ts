import { z } from "zod";

export const addStudentSchema = z.object({
	firstName: z.string().min(1).max(100),
	secondName: z.string().max(100).optional(),
	firstLastname: z.string().min(1).max(100),
	secondLastname: z.string().max(100).optional(),
	birthDate: z.string().optional(),
	sex: z.enum(["M", "F"]).optional(),
});

export type AddStudentInput = z.infer<typeof addStudentSchema>;
