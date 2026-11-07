import { z } from "zod";

/** Identifiant Prisma (cuid) — borné pour ne jamais envoyer n'importe quoi à la BDD. */
export const idSchema = z.string().min(1).max(64).regex(/^[a-z0-9]+$/i);

/** Commentaire : texte brut, 2 à 2000 caractères (SPEC §5), rendu échappé par React. */
export const commentSchema = z.object({
  projectId: idSchema,
  body: z
    .string({ error: "errors.required" })
    .trim()
    .min(2, { error: "errors.commentLength" })
    .max(2000, { error: "errors.commentLength" }),
});

export type CommentInput = z.infer<typeof commentSchema>;
