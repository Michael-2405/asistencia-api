import { Resend } from "resend";
import { env } from "@/shared/config/env.js";

export const resend = new Resend(env.RESEND_API_KEY);
