"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { type ActionResult, fail, ok } from "@/lib/validation/action-result";
import { idSchema } from "@/lib/validation/comments";

/** Ajoute ou retire un projet publié des favoris de l'utilisateur connecté. */
export async function toggleFavorite(projectId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(projectId);
  if (!parsed.success) return fail("errors.notFound");

  const key = { userId_projectId: { userId: user.id, projectId: parsed.data } };
  const existing = await db.favorite.findUnique({ where: key, select: { projectId: true } });

  let favorited: boolean;
  if (existing) {
    await db.favorite.delete({ where: key });
    favorited = false;
  } else {
    const project = await db.project.findFirst({
      where: { id: parsed.data, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!project) return fail("errors.notFound");
    await db.favorite.create({ data: { userId: user.id, projectId: project.id } });
    favorited = true;
  }

  revalidatePath("/[locale]/compte", "page");
  revalidatePath("/[locale]/projets/[slug]", "page");
  return ok({ favorited });
}

export type FavoriteItem = {
  projectId: string;
  slug: string;
  title: string;
  createdAt: Date;
};

/** Favoris de l'utilisateur connecté (projets publiés), titre dans la langue courante. */
export async function listMyFavorites(): Promise<ActionResult<FavoriteItem[]>> {
  const user = await requireUser();
  const locale = await getLocale();

  const rows = await db.favorite.findMany({
    where: { userId: user.id, project: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      project: {
        select: { id: true, slug: true, translations: { select: { locale: true, title: true } } },
      },
    },
  });

  return ok(
    rows.map((r) => {
      const t =
        r.project.translations.find((x) => x.locale === locale) ?? r.project.translations[0];
      return {
        projectId: r.project.id,
        slug: r.project.slug,
        title: t?.title ?? r.project.slug,
        createdAt: r.createdAt,
      };
    }),
  );
}
