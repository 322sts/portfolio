import { z } from "zod";
import { emailSchema } from "./auth";

export const contactSchema = z.object({
  name: z.string({ error: "errors.required" }).trim().min(1, { error: "errors.required" }).max(100, { error: "errors.nameLength" }),
  email: emailSchema,
  subject: z.string({ error: "errors.required" }).trim().min(1, { error: "errors.required" }).max(150, { error: "errors.subjectLength" }),
  body: z.string({ error: "errors.required" }).trim().min(10, { error: "errors.messageLength" }).max(5000, { error: "errors.messageLength" }),
});

export type ContactInput = z.infer<typeof contactSchema>;
