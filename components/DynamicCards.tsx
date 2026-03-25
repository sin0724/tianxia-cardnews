"use client";

import type { CardNewsContent } from "./CardTemplates";

export interface CardStyleConfig {
  id: string;
  name: string;
  // 컬러
  primary: string;       // 포인트 색상
  coverBg: string;       // 커버/CTA 배경
  darkCardBg: string;    // 다크 카드 배경 (Card2)
  lightCardBg: string;   // 라이트 카드 배경 (Card3, 4)
  accentBg: string;      // TIP박스 등 강조 배경
  textOnPrimary: string; // 포인트 배경 위 텍스트
  textOnDark: string;    // 다크 배경 위 텍스트
  textOnLight: string;   // 밝은 배경 위 텍스트
  mutedOnDark: string;   // 다크 배경 흐린 텍스트
  mutedOnLight: string;  // 밝은 배경 흐린 텍스트
  // 스타일
  cornerRadius: number;                        // 박스 모서리 (px)
  badgeStyle: "filled" | "outlined" | "pill"; // 뱃지 모양
  accentType: "bar" | "line" | "box" | "none"; // 강조 요소
}

const BASE: React.CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
  wordBreak: "keep-all",
  overflowWrap: "break-word",
};

function Logo({ light }: { light?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? "/티엔샤로고-white.png" : "/티엔샤로고.png"}
      alt="TIANXIA"
      style={{ height: 34, width: "auto" }}
      crossOrigin="anonymous"
    />
  );
}

function DynFooter({ page, cat, s, light }: { page: string; cat: string; s: CardStyleConfig; light?: boolean }) {
  const c = light ? s.mutedOnDark : s.mutedOnLight;
  return (
    <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 26, fontWeight: 600, color: c }}>{page}</span>
      <span style={{ fontSize: 26, fontWeight: 600, color: c }}>{cat}</span>
    </div>
  );
}

function BadgeEl({ text, s, onBg }: { text: string; s: CardStyleConfig; onBg: "primary" | "light" }) {
  const base: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    display: "inline-block",
  };
  if (s.badgeStyle === "pill") {
    return (
      <span style={{
        ...base,
        background: onBg === "primary" ? "rgba(0,0,0,0.3)" : s.primary,
        color: onBg === "primary" ? s.textOnPrimary : s.textOnPrimary,
        padding: "12px 28px",
        borderRadius: 40,
      }}>{text}</span>
    );
  }
  if (s.badgeStyle === "outlined") {
    return (
      <span style={{
        ...base,
        border: `3px solid ${onBg === "primary" ? s.textOnPrimary : s.primary}`,
        color: onBg === "primary" ? s.textOnPrimary : s.primary,
        padding: "10px 24px",
        borderRadius: s.cornerRadius,
      }}>{text}</span>
    );
  }
  // filled
  return (
    <span style={{
      ...base,
      background: onBg === "primary" ? "rgba(0,0,0,0.3)" : s.primary,
      color: s.textOnPrimary,
      padding: "12px 24px",
      borderRadius: s.cornerRadius,
    }}>{text}</span>
  );
}

function AccentBar({ s, vertical }: { s: CardStyleConfig; vertical?: boolean }) {
  if (s.accentType === "none") return null;
  if (s.accentType === "bar") {
    if (vertical) {
      return <div style={{ position: "absolute", left: 0, top: "20%", height: "60%", width: 8, background: s.primary, borderRadius: "0 4px 4px 0" }} />;
    }
    return <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: s.primary }} />;
  }
  if (s.accentType === "line") {
    return <div style={{ width: 60, height: 5, background: s.primary, borderRadius: 3, marginBottom: 36 }} />;
  }
  return null;
}

// ─────────────────────────────────────────────────
// DynCard1 — 커버
// ─────────────────────────────────────────────────
export function DynCard1({ data, page, cat, s }: { data: CardNewsContent["card1"]; page: string; cat: string; s: CardStyleConfig }) {
  return (
    <div style={{ ...BASE, background: s.coverBg }}>
      {s.accentType === "bar" && <AccentBar s={s} />}

      <div style={{ position: "absolute", top: 52, right: 60 }}>
        <Logo light />
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 72px" }}>
        <div style={{ marginBottom: 44 }}>
          <BadgeEl text={data.badge} s={s} onBg="primary" />
        </div>

        <div style={{ fontSize: 90, fontWeight: 900, color: s.textOnPrimary, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
          {data.title_line1}
        </div>
        <div style={{
          display: "inline-block",
          fontSize: 90,
          fontWeight: 900,
          color: s.textOnPrimary,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          background: "rgba(0,0,0,0.25)",
          padding: "4px 22px",
          borderRadius: s.cornerRadius,
          marginBottom: 36,
        }}>
          {data.title_line2}
        </div>

        <div style={{ width: 60, height: 5, background: s.textOnPrimary, borderRadius: 3, marginBottom: 36, opacity: 0.6 }} />

        <div style={{ fontSize: 36, fontWeight: 500, color: s.mutedOnDark, lineHeight: 1.65 }}>
          {data.subtitle}
        </div>
      </div>

      <DynFooter page={page} cat={cat} s={s} light />
    </div>
  );
}

// ─────────────────────────────────────────────────
// DynCard2 — 후킹
// ─────────────────────────────────────────────────
export function DynCard2({ data, page, cat, s }: { data: CardNewsContent["card2"]; page: string; cat: string; s: CardStyleConfig }) {
  const parts = data.highlight ? data.title.split(data.highlight) : [data.title];

  return (
    <div style={{ ...BASE, background: s.darkCardBg }}>
      {s.accentType === "bar" && <AccentBar s={s} vertical />}

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: `80px 80px 80px ${s.accentType === "bar" ? 96 : 80}px` }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: s.primary, marginBottom: 28, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {data.label}
        </div>

        <div style={{ fontSize: 76, fontWeight: 900, color: s.textOnDark, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: 4 }}>
          {parts.length > 1 ? (
            <>
              {parts[0]}
              <span style={{ background: s.primary, color: s.textOnPrimary, padding: "2px 14px", borderRadius: s.cornerRadius / 2 }}>
                {data.highlight}
              </span>
              {parts[1]}
            </>
          ) : data.title}
        </div>

        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.12)", margin: "36px 0" }} />

        <div style={{ fontSize: 34, fontWeight: 400, color: s.mutedOnDark, lineHeight: 1.75 }}>
          {data.body}
        </div>
      </div>

      <DynFooter page={page} cat={cat} s={s} light />
    </div>
  );
}

// ─────────────────────────────────────────────────
// DynCard3 — 인사이트
// ─────────────────────────────────────────────────
export function DynCard3({ data, page, cat, s }: { data: CardNewsContent["card3"]; page: string; cat: string; s: CardStyleConfig }) {
  const parts = data.highlight ? data.body.split(`[[${data.highlight}]]`) : [data.body];

  return (
    <div style={{ ...BASE, background: s.lightCardBg, padding: "72px 72px 80px" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: s.mutedOnLight, marginBottom: 20 }}>{data.category}</div>
      <div style={{ fontSize: 72, fontWeight: 900, color: s.textOnLight, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32 }}>
        {data.title}
      </div>
      <div style={{ width: "100%", height: 1, background: s.mutedOnLight, opacity: 0.3, marginBottom: 40 }} />
      <div style={{ fontSize: 34, fontWeight: 400, color: s.textOnLight, lineHeight: 1.8, marginBottom: 48 }}>
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <span style={{ background: s.primary, color: s.textOnPrimary, padding: "0 8px", borderRadius: s.cornerRadius / 4 }}>
                {data.highlight}
              </span>
            )}
          </span>
        ))}
      </div>

      <div style={{ background: s.accentBg, borderRadius: s.cornerRadius, padding: "32px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: s.textOnPrimary, letterSpacing: "0.12em", marginBottom: 14 }}>TIP</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: s.textOnPrimary, lineHeight: 1.65 }}>{data.tip}</div>
      </div>

      <DynFooter page={page} cat={cat} s={s} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// DynCard4 — 리스트
// ─────────────────────────────────────────────────
export function DynCard4({ data, page, cat, s }: { data: CardNewsContent["card4"]; page: string; cat: string; s: CardStyleConfig }) {
  return (
    <div style={{ ...BASE, background: s.lightCardBg, padding: "72px 72px 80px" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: s.mutedOnLight, marginBottom: 20 }}>{data.category}</div>
      <div style={{ fontSize: 66, fontWeight: 900, color: s.textOnLight, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 48 }}>
        {data.title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{
            background: "#FFFFFF",
            borderRadius: s.cornerRadius,
            padding: "28px 36px",
            borderLeft: s.accentType !== "none" ? `7px solid ${s.primary}` : "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.primary, letterSpacing: "0.03em" }}>{item.tag}</span>
            <div style={{ fontSize: 38, fontWeight: 800, color: s.textOnLight, lineHeight: 1.2 }}>{item.title}</div>
            <div style={{ fontSize: 28, fontWeight: 400, color: s.mutedOnLight, lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <DynFooter page={page} cat={cat} s={s} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// DynCard5 — CTA
// ─────────────────────────────────────────────────
export function DynCard5({ data, page, cat, s }: { data: CardNewsContent["card5"]; page: string; cat: string; s: CardStyleConfig }) {
  return (
    <div style={{ ...BASE, background: s.coverBg }}>
      {s.accentType === "bar" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "rgba(0,0,0,0.2)" }} />}

      <div style={{ position: "absolute", top: 52, right: 60 }}>
        <Logo light />
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 72px" }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ width: 52, height: 64, background: "rgba(0,0,0,0.3)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)", borderRadius: "6px 6px 0 0" }} />
        </div>
        <div style={{ fontSize: 82, fontWeight: 900, color: s.textOnPrimary, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 28 }}>
          {data.main}
        </div>
        <div style={{ fontSize: 34, fontWeight: 400, color: s.mutedOnDark, lineHeight: 1.65, marginBottom: 56 }}>
          {data.subtitle}
        </div>
        <div>
          <span style={{
            display: "inline-block",
            background: s.textOnPrimary,
            color: s.coverBg,
            fontSize: 36,
            fontWeight: 800,
            padding: "20px 60px",
            borderRadius: s.cornerRadius * 2,
          }}>
            {data.cta}
          </span>
        </div>
      </div>

      <DynFooter page={page} cat={cat} s={s} light />
    </div>
  );
}
