import { z } from "zod";

export const createCourseSchema = z
	.object({
		grade: z.string().min(1).max(20),
		section: z.string().min(1).max(5),
		educationLevel: z.enum(["PRIMARY", "SECONDARY"]),
		isHomeroom: z.boolean(),
		subjectId: z.string().uuid().optional(),
	})
	.refine(
		(data) => (data.isHomeroom ? data.subjectId === undefined : data.subjectId !== undefined),
		{
			message: "Un curso de encargado no lleva materia; un curso de area require una materia",
			path: ["subjectId"],
		},
	)
	.refine((data) => !(data.isHomeroom && data.educationLevel === "SECONDARY"), {
		message: "Un docente de secundaria no puede tener cursos de encargado de seccion",
		path: ["isHomeroom"],
	});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
