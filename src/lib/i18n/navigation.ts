import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Composants et helpers de navigation localisés (chemins traduits automatiquement).
// Usage : <Link href="/projets"> ou <Link href={{ pathname: "/projets/[slug]", params: { slug } }}>
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
