import { z } from "zod";

export const reactivateAccountSchema = z.object({ password: z.string().min(1) });

export type ReactivateAccountInput = z.infer<typeof reactivateAccountSchema>;
