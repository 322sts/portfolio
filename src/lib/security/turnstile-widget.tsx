"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Widget Cloudflare Turnstile (rendu explicite). À placer DANS un <form> : il y
 * ajoute le champ caché `cf-turnstile-response` lu par la Server Action.
 * Le script est injecté dynamiquement par ce composant (autorisé par la CSP grâce à
 * 'strict-dynamic' : il est créé par un script de confiance portant le nonce).
 * `resetKey` : changer sa valeur réinitialise le widget (un jeton ne sert qu'une fois).
 */

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = {
  siteKey: string | null;
  /** Code langue (fr, en) pour les textes du widget. */
  language: string;
  /** Libellé accessible du conteneur. */
  label: string;
  /** Message affiché si le script ne peut pas se charger. */
  unavailableText: string;
  resetKey?: unknown;
  className?: string;
};

export function TurnstileWidget({ siteKey, language, label, unavailableText, resetKey, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    const el = ref.current;
    loadTurnstile()
      .then((api) => {
        if (cancelled || widgetId.current) return;
        widgetId.current = api.render(el, { sitekey: siteKey, language, theme: "auto" });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, language]);

  useEffect(() => {
    if (resetKey !== undefined && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <div className={className} role="group" aria-label={label}>
      <div ref={ref} />
      {failed ? <p role="alert">{unavailableText}</p> : null}
    </div>
  );
}
