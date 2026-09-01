import { z } from "zod";

export const registerTeacherSchema = z
	.object({
		fullName: z.string().min(3).max(200),
		email: z.string().email(),
		password: z.string().min(8),
		educationLevel: z.enum(["PRIMARY", "SECONDARY"]),
		isHomeroomTeacher: z.boolean(),
		subjectId: z.string().uuid().optional(),
	})
	.refine(
		(data) =>
			data.isHomeroomTeacher ? data.subjectId === undefined : data.subjectId !== undefined,
		{
			message:
				"Un encargado de sección no selecciona materia; un docente no encargado debe seleccionar exactamente una",
			path: ["subjectId"],
		},
	)
	.refine((data) => !(data.isHomeroomTeacher && data.educationLevel === "SECONDARY"), {
		message:
			"Un docente de secundaria siempre tiene una materia asignada (RN-AUTH-03), no puede ser encargado de sección",
		path: ["isHomeroomTeacher"],
	});

export type RegisterTeacherInput = z.infer<typeof registerTeacherSchema>;
