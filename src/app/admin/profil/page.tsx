import type { Metadata } from "next";
import { getProfile } from "@/lib/admin/queries";
import { cloudinaryEnabled } from "@/lib/cloudinary/server";
import { PageHeader } from "../_components/PageHeader";
import styles from "../_components/admin.module.css";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profil" };

export default async function AdminProfilePage() {
  const p = await getProfile();
  return (
    <main id="contenu" className={styles.page}>
      <PageHeader code="A6" title="Profil" lede="Bio, liens, CV et photo affichés sur l'accueil, « À propos », « Contact » et dans le pied de page." />
      <ProfileForm
        cloudinary={cloudinaryEnabled}
        initial={{
          bioFr: p?.bioFr ?? "",
          bioEn: p?.bioEn ?? "",
          githubUrl: p?.githubUrl ?? "https://github.com/322sts",
          linkedinUrl: p?.linkedinUrl ?? "https://www.linkedin.com/in/albangrelaud/",
          email: p?.email ?? "albangrelaud@proton.me",
          cvUrl: p?.cvUrl ?? "",
          photoUrl: p?.photoUrl ?? "",
        }}
      />
    </main>
  );
}
