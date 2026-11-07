import "server-only";
import { hash, verify } from "@node-rs/argon2";

/** argon2id (algorithme par défaut de @node-rs/argon2, paramètres par défaut). */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

let dummyHash: Promise<string> | null = null;

/**
 * Vérifie un mot de passe. Si l'utilisateur n'existe pas (ou n'a pas de mot de passe,
 * compte GitHub), on vérifie quand même contre un hash factice pour que le temps de
 * réponse ne révèle pas l'existence du compte.
 */
export async function verifyPassword(
  passwordHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  try {
    if (!passwordHash) {
      dummyHash ??= hash("mot-de-passe-factice-pour-timing");
      await verify(await dummyHash, password);
      return false;
    }
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
