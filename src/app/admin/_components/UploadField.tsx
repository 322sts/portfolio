"use client";

import { useId, useState } from "react";
import { Button, TextInput } from "@/components/form";
import { checkFile, uploadToCloudinary } from "@/lib/cloudinary/client";
import { UPLOAD_KINDS, type UploadKind } from "@/lib/cloudinary/kinds";
import { getUploadSignature } from "@/server/actions/admin/uploads";
import styles from "./form.module.css";

type Props = {
  id: string;
  label: string;
  kind: UploadKind;
  value: string;
  onChange: (url: string) => void;
  error?: string | null;
  cloudinary: boolean;
  /** Aperçu image (sinon simple lien). */
  preview?: "image" | "link";
  required?: boolean;
};

/**
 * Champ d'URL de fichier : envoi signé direct vers Cloudinary si configuré, sinon URL https à coller.
 * L'URL reste modifiable à la main ; le serveur la revalide à l'enregistrement.
 */
export function UploadField({ id, label, kind, value, onChange, error, cloudinary, preview = "image", required }: Props) {
  const spec = UPLOAD_KINDS[kind];
  const fileId = useId();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file, kind);
    if (problem) {
      setStatus({ tone: "error", text: problem });
      return;
    }
    setBusy(true);
    setStatus(null);
    const sig = await getUploadSignature(kind);
    if (!sig.ok) {
      setBusy(false);
      setStatus({ tone: "error", text: sig.error });
      return;
    }
    const r = await uploadToCloudinary(file, sig.data);
    setBusy(false);
    if (r.ok) {
      onChange(r.url);
      setStatus({ tone: "ok", text: "Fichier envoyé. Pensez à enregistrer le formulaire." });
    } else {
      setStatus({ tone: "error", text: r.error });
    }
  }

  const hint = cloudinary
    ? `Envoyez un fichier (${spec.label}) ou collez une URL res.cloudinary.com de votre compte.`
    : `Cloudinary non configuré : collez une URL https (${spec.label}). Les images ne s'affichent que si elles sont servies par le site ou par res.cloudinary.com (CSP).`;

  return (
    <div className={styles.upload}>
      <TextInput
        id={id}
        label={label}
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        hint={hint}
        error={error}
        required={required}
        autoComplete="off"
        spellCheck={false}
      />
      <div className={styles.uploadTools}>
        {cloudinary ? (
          <label htmlFor={fileId} className={styles.fileLabel} data-busy={busy || undefined}>
            <input
              id={fileId}
              type="file"
              accept={spec.mime.join(",")}
              className={styles.fileInput}
              disabled={busy}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span aria-hidden="true">{busy ? "Envoi en cours…" : "Choisir un fichier…"}</span>
            <span className="sr-only">{`Envoyer un fichier pour « ${label} »`}</span>
          </label>
        ) : null}
        {value ? (
          <Button size="sm" variant="ghost" onClick={() => onChange("")}>
            Retirer
          </Button>
        ) : null}
        {status ? (
          <span role={status.tone === "error" ? "alert" : "status"} className={status.tone === "error" ? styles.err : styles.okText}>
            {status.text}
          </span>
        ) : null}
        {busy ? <span role="status" className="sr-only">Envoi en cours</span> : null}
      </div>
      {value && /^(https:\/\/|\/)/.test(value) ? (
        preview === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu admin d'une URL arbitraire (next/image exigerait une liste de domaines)
          <img src={value} alt="" className={styles.thumb} />
        ) : (
          <a href={value} target="_blank" rel="noopener noreferrer" className={styles.meta}>
            Ouvrir le fichier
          </a>
        )
      ) : null}
    </div>
  );
}
