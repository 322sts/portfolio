import "server-only";
import { z } from "zod";
import { httpsUrl, optionalUploadedUrl } from "./common";

export const profileInputSchema = z.object({
  bioFr: z.string().trim().max(20_000, "20 000 caractères maximum.").default(""),
  bioEn: z.string().trim().max(20_000, "20 000 caractères maximum.").default(""),
  githubUrl: httpsUrl.refine((v) => /^https:\/\/(www\.)?github\.com\//i.test(v), "Adresse GitHub attendue (https://github.com/…)."),
  linkedinUrl: httpsUrl.refine((v) => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(v), "Adresse LinkedIn attendue (https://www.linkedin.com/…)."),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide.")),
  cvUrl: optionalUploadedUrl("cv", { lenient: true }),
  photoUrl: optionalUploadedUrl("profilePhoto"),
});
