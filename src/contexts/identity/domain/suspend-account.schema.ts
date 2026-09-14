import { z } from "zod";

export const suspendAccountSchema = z.object({ password: z.string().min(1) });

export type SuspendAccountInput = z.infer<typeof suspendAccountSchema>;
