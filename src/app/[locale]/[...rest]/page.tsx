import { notFound } from "next/navigation";

// Attrape-tout : toute URL inconnue sous une locale affiche la 404 localisée.
export default function CatchAll() {
  notFound();
}
