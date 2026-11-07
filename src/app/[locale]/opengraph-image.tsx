import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { asLocale } from "./_lib/seo";

// Image Open Graph (agent 4) : plan cyanotype — trame, cotes, cartouche. Couleurs de tokens.css.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Alban Grelaud — portfolio";

const BG = "#1E3F86";
const GRID = "#2D51A0";
const GRID_MAJOR = "#3A62B5";
const INK = "#F2F5FA";
const MUTED = "#A4C8F2";
const MARK = "#F2D04B";

type Props = { params: Promise<{ locale: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const tb = await getTranslations({ locale, namespace: "ui.titleBlock" });

  const cell = (label: string, value: string, flex = 1) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex,
        padding: "10px 16px",
        borderLeft: `2px solid ${INK}`,
      }}
    >
      <span style={{ fontSize: 14, color: MUTED, letterSpacing: 2 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 22, color: INK, letterSpacing: 1 }}>{value.toUpperCase()}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: BG,
          backgroundImage: `linear-gradient(${GRID_MAJOR} 1px, transparent 1px), linear-gradient(90deg, ${GRID_MAJOR} 1px, transparent 1px), linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
          backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
          padding: 24,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: `3px solid ${INK}`,
            padding: "56px 64px 0",
            color: INK,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Cote au-dessus du nom */}
            <div style={{ display: "flex", alignItems: "center", width: 900, color: MARK }}>
              <div style={{ width: 2, height: 26, backgroundColor: MARK }} />
              <div style={{ flex: 1, height: 2, backgroundColor: MARK }} />
              <span style={{ fontSize: 22, padding: "0 16px", letterSpacing: 3 }}>{t("subtitle").toUpperCase()}</span>
              <div style={{ flex: 1, height: 2, backgroundColor: MARK }} />
              <div style={{ width: 2, height: 26, backgroundColor: MARK }} />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 132,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: 4,
                marginTop: 18,
              }}
            >
              ALBAN GRELAUD
            </div>
            <div style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 28, maxWidth: 980 }}>
              {t("interests")}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignSelf: "flex-end",
              width: 760,
              borderTop: `2px solid ${INK}`,
              borderLeft: `0px solid ${INK}`,
              marginRight: -64,
            }}
          >
            {cell(tb("title"), "Portfolio", 2)}
            {cell(tb("author"), tb("authorValue"), 2)}
            {cell(tb("institution"), tb("institutionValue"), 2)}
            {cell(tb("scale"), "1:1", 1)}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
