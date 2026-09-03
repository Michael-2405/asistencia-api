import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { respondSuccess } from "@/shared/http/respond.js";
import { requireAuth } from "@/shared/middleware/require-auth.middleware.js";
import { validate } from "@/shared/middleware/validate.middleware.js";
import { getMyProfile } from "../../application/get-my-profile.use-case.js";
import { reactivateAccount } from "../../application/reactivate-account.use-case.js";
import { suspendAccount } from "../../application/suspend-account.use-case.js";

const suspendSchema = z.object({ password: z.string().min(1) });

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get("/teachers/me", async (req, res) => {
	const profile = await getMyProfile(req.userId);
	respondSuccess(res, profile);
});

meRouter.post(
	"/teachers/me/suspend",
	validate(suspendSchema),
	async (req: Request, res: Response) => {
		const result = await suspendAccount(req.userId, req.body.password, req.headers);
		respondSuccess(res, result);
	},
);

meRouter.post("/teachers/me/reactivate", async (req, res) => {
	const result = await reactivateAccount(req.userId);
	respondSuccess(res, result);
});
