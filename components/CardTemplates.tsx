"use client";

// 카드 사이즈: 1080x1350px (인스타그램 4:5 피드)
// 미리보기용 scale은 호출부에서 결정

export interface CardNewsContent {
  category: string;
  card1: { badge: string; title_line1: string; title_line2: string; subtitle: string };
  card2: { label: string; title: string; highlight: string; body: string };
  card3: { category: string; title: string; body: string; highlight: string; tip: string };
  card4: { category: string; title: string; items: { tag: string; title: string; desc: string }[] };
  card5: { main: string; subtitle: string; cta: string };
  caption: string;
}

const R = "#DC2626";   // brand red
const D = "#1A1A1A";   // dark
const G = "#F4F4F4";   // gray bg
const W = "#FFFFFF";   // white

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

function HighlightText({ body, kw }: { body: string; kw: string }) {
  if (!kw) return <>{body}</>;
  const parts = body.split(`[[${kw}]]`);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span style={{ background: R, color: W, padding: "0 8px", borderRadius: 4 }}>
              {kw}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

function Footer({ page, cat, light }: { page: string; cat: string; light?: boolean }) {
  const c = light ? "rgba(255,255,255,0.6)" : "#aaa";
  return (
    <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 26, fontWeight: 600, color: c }}>{page}</span>
      <span style={{ fontSize: 26, fontWeight: 600, color: c }}>{cat}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 1 — 커버 (레드 풀배경)
// ─────────────────────────────────────────────────
export function Card1({ data, page, cat }: { data: CardNewsContent["card1"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: R }}>
      {/* 로고 */}
      <div style={{ position: "absolute", top: 52, right: 60 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 34, width: "auto", filter: "brightness(0) invert(1) saturate(0)" }} crossOrigin="anonymous" />
      </div>

      {/* 본문 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 72px" }}>
        {/* 뱃지 */}
        <div style={{ marginBottom: 44 }}>
          <span style={{ background: D, color: W, fontSize: 26, fontWeight: 700, padding: "14px 28px", borderRadius: 40 }}>
            {data.badge}
          </span>
        </div>

        {/* 제목 라인1 */}
        <div style={{ fontSize: 90, fontWeight: 900, color: W, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
          {data.title_line1}
        </div>

        {/* 제목 라인2 (강조 박스) */}
        <div style={{ display: "inline-block", fontSize: 90, fontWeight: 900, color: W, lineHeight: 1.1, letterSpacing: "-0.02em", background: D, padding: "4px 22px", borderRadius: 14, marginBottom: 36 }}>
          {data.title_line2}
        </div>

        {/* 구분선 */}
        <div style={{ width: 60, height: 6, background: W, borderRadius: 3, marginBottom: 36 }} />

        {/* 서브타이틀 */}
        <div style={{ fontSize: 36, fontWeight: 500, color: "rgba(255,255,255,0.82)", lineHeight: 1.65 }}>
          {data.subtitle}
        </div>
      </div>

      <Footer page={page} cat={cat} light />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 2 — 후킹 (다크 배경)
// ─────────────────────────────────────────────────
export function Card2({ data, page, cat }: { data: CardNewsContent["card2"]; page: string; cat: string }) {
  const parts = data.highlight ? data.title.split(data.highlight) : [data.title];

  return (
    <div style={{ ...BASE, background: "linear-gradient(150deg,#1c1c1c 0%,#2a2a2a 60%,#111 100%)" }}>
      {/* 왼쪽 레드 바 */}
      <div style={{ position: "absolute", left: 0, top: "22%", height: "56%", width: 8, background: R, borderRadius: "0 4px 4px 0" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 80px 80px 88px" }}>
        {/* 소라벨 */}
        <div style={{ fontSize: 28, fontWeight: 700, color: R, marginBottom: 28, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {data.label}
        </div>

        {/* 메인 제목 */}
        <div style={{ fontSize: 76, fontWeight: 900, color: W, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: 4 }}>
          {parts.length > 1 ? (
            <>
              {parts[0]}
              <span style={{ background: R, color: W, padding: "2px 14px", borderRadius: 8 }}>{data.highlight}</span>
              {parts[1]}
            </>
          ) : data.title}
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.12)", margin: "36px 0" }} />

        {/* 본문 */}
        <div style={{ fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,0.72)", lineHeight: 1.75 }}>
          {data.body}
        </div>
      </div>

      <Footer page={page} cat={cat} light />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 3 — 인사이트 (라이트 그레이)
// ─────────────────────────────────────────────────
export function Card3({ data, page, cat }: { data: CardNewsContent["card3"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: G, padding: "72px 72px 80px" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: "#888", marginBottom: 20 }}>{data.category}</div>

      <div style={{ fontSize: 72, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32 }}>
        {data.title}
      </div>

      <div style={{ width: "100%", height: 1, background: "#DCDCDC", marginBottom: 40 }} />

      <div style={{ fontSize: 34, fontWeight: 400, color: "#333", lineHeight: 1.8, marginBottom: 48 }}>
        <HighlightText body={data.body} kw={data.highlight} />
      </div>

      {/* TIP 박스 */}
      <div style={{ background: R, borderRadius: 18, padding: "32px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: W, letterSpacing: "0.12em", marginBottom: 14 }}>TIP</div>
        <div style={{ fontSize: 32, fontWeight: 500, color: W, lineHeight: 1.65 }}>{data.tip}</div>
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 4 — 리스트 (라이트 그레이)
// ─────────────────────────────────────────────────
export function Card4({ data, page, cat }: { data: CardNewsContent["card4"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: G, padding: "72px 72px 80px" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: "#888", marginBottom: 20 }}>{data.category}</div>

      <div style={{ fontSize: 66, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 48 }}>
        {data.title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ background: W, borderRadius: 16, padding: "30px 36px", borderLeft: `7px solid ${R}`, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: R, letterSpacing: "0.03em" }}>{item.tag}</span>
            <div style={{ fontSize: 38, fontWeight: 800, color: D, lineHeight: 1.2 }}>{item.title}</div>
            <div style={{ fontSize: 28, fontWeight: 400, color: "#555", lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 5 — CTA (레드 풀배경)
// ─────────────────────────────────────────────────
export function Card5({ data, page, cat }: { data: CardNewsContent["card5"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: R }}>
      {/* 로고 */}
      <div style={{ position: "absolute", top: 52, right: 60 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 34, width: "auto", filter: "brightness(0) invert(1) saturate(0)" }} crossOrigin="anonymous" />
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 72px" }}>
        {/* 북마크 아이콘 */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ width: 52, height: 64, background: D, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)", borderRadius: "6px 6px 0 0" }} />
        </div>

        {/* 메인 텍스트 */}
        <div style={{ fontSize: 82, fontWeight: 900, color: W, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 28 }}>
          {data.main}
        </div>

        {/* 서브 */}
        <div style={{ fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, marginBottom: 56 }}>
          {data.subtitle}
        </div>

        {/* CTA 버튼 */}
        <div>
          <span style={{ display: "inline-block", background: W, color: D, fontSize: 36, fontWeight: 800, padding: "20px 60px", borderRadius: 60 }}>
            {data.cta}
          </span>
        </div>
      </div>

      <Footer page={page} cat={cat} light />
    </div>
  );
}
