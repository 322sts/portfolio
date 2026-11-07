"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/form";
import { toggleFavorite } from "@/server/actions/favorites";

type Props = {
  projectId: string;
  initialFavorited: boolean;
};

/** Bouton bascule favori (utilisateur connecté) : aria-pressed reflète l'état réel renvoyé par l'action. */
export function FavoriteButton({ projectId, initialFavorited }: Props) {
  const t = useTranslations("projects");
  const te = useTranslations();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Button
        variant={favorited ? "primary" : "secondary"}
        size="sm"
        aria-pressed={favorited}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleFavorite(projectId);
            if (result.ok) {
              setFavorited(result.data.favorited);
              setError(null);
            } else {
              setError(te(result.error));
            }
          })
        }
      >
        {favorited ? t("unfavorite") : t("favorite")}
      </Button>
      {error ? (
        <p role="alert" className="mono-caps">
          {error}
        </p>
      ) : null}
    </div>
  );
}
