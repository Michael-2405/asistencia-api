import { z } from "zod";

export const createSchoolYearSchema = z
	.object({
		name: z.string().regex(/^\d{4}-\d{4}$/, "Formato esperado: AAAA-AAAA, ej. 2027-2028"),
		startDate: z.string().date(),
		endDate: z.string().date(),
	})
	.refine((data) => data.startDate < data.endDate, {
		message: "La fecha de inicio debe ser anterior a la fecha de fin",
		path: ["endDate"],
	})
	.refine(
		(data) => {
			const [first, second] = data.name.split("-").map(Number);
			return second === first + 1;
		},
		{
			message: "El segundo año debe ser el consecutivo del primero (ej. 2027-2028)",
			path: ["name"],
		},
	);

export type CreateSchoolYearInput = z.infer<typeof createSchoolYearSchema>;
