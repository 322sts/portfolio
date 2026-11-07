import type { routing } from "@/lib/i18n/routing";
import type messages from "../messages/fr.json";

// Typage fort de next-intl : locales autorisées et clés de messages (fr.json = référence).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
