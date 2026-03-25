"use client";

import type { CardNewsContent } from "./CardTemplates";

const R = "#DC2626";
const D = "#1A1A1A";
const W = "#FFFFFF";

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
      style={{ height: 32, width: "auto" }}
      crossOrigin="anonymous"
    />
  );
}

function PageBadge({ page, light }: { page: string; light?: boolean }) {
  return (
    <span
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: light ? "rgba(255,255,255,0.55)" : "#bbb",
        letterSpacing: "0.05em",
      }}
    >
      {page}
    </span>
  );
}

// ─────────────────────────────────────────────────
// Card 1B — 에디토리얼 커버 (흰 배경 + 레드 상단바)
// ─────────────────────────────────────────────────
export function Card1B({ data, page, cat }: { data: CardNewsContent["card1"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: W }}>
      {/* 상단 레드 풀바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: R }} />

      {/* 상단 로고 + 카테고리 */}
      <div style={{ position: "absolute", top: 52, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb", letterSpacing: "0.08em" }}>{cat}</span>
      </div>

      {/* 뱃지 */}
      <div style={{ position: "absolute", top: 200, left: 64 }}>
        <span style={{ background: R, color: W, fontSize: 24, fontWeight: 700, padding: "10px 24px", borderRadius: 6 }}>
          {data.badge}
        </span>
      </div>

      {/* 메인 타이틀 */}
      <div style={{ position: "absolute", top: 325, left: 64, right: 64 }}>
        <div style={{ fontSize: 100, fontWeight: 900, color: D, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          {data.title_line1}
        </div>
        <div style={{ fontSize: 100, fontWeight: 900, color: R, lineHeight: 1.05, letterSpacing: "-0.03em", marginTop: 8 }}>
          {data.title_line2}
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ position: "absolute", top: 825, left: 64, width: 80, height: 4, background: D }} />

      {/* 서브타이틀 */}
      <div style={{ position: "absolute", top: 865, left: 64, right: 64, fontSize: 34, fontWeight: 400, color: "#555", lineHeight: 1.7 }}>
        {data.subtitle}
      </div>

      {/* 하단 페이지 번호 */}
      <div style={{ position: "absolute", bottom: 52, right: 64 }}>
        <PageBadge page={page} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 2B — 인용구 포커스 (다크 배경 + 인용 마크)
// ─────────────────────────────────────────────────
export function Card2B({ data, page, cat }: { data: CardNewsContent["card2"]; page: string; cat: string }) {
  const parts = data.highlight ? data.title.split(data.highlight) : [data.title];

  return (
    <div style={{ ...BASE, background: D }}>
      {/* 장식용 따옴표 */}
      <div style={{ position: "absolute", top: 60, left: 52, fontSize: 220, fontWeight: 900, color: "rgba(220,38,38,0.18)", lineHeight: 1, fontFamily: "Georgia, serif" }}>
        "
      </div>

      {/* 상단 라벨 */}
      <div style={{ position: "absolute", top: 72, right: 64, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <Logo light />
        <span style={{ fontSize: 22, fontWeight: 700, color: R, letterSpacing: "0.06em" }}>{data.label}</span>
      </div>

      {/* 메인 타이틀 */}
      <div style={{ position: "absolute", top: 350, left: 64, right: 64, fontSize: 72, fontWeight: 900, color: W, lineHeight: 1.3, letterSpacing: "-0.02em" }}>
        {parts.length > 1 ? (
          <>
            {parts[0]}
            <span style={{ color: R }}>{data.highlight}</span>
            {parts[1]}
          </>
        ) : data.title}
      </div>

      {/* 가로 구분선 */}
      <div style={{ position: "absolute", top: 850, left: 64, right: 64, height: 2, background: "rgba(255,255,255,0.15)" }} />

      {/* 본문 */}
      <div style={{ position: "absolute", top: 890, left: 64, right: 64, fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.75 }}>
        {data.body}
      </div>

      {/* 하단 */}
      <div style={{ position: "absolute", bottom: 52, left: 64, right: 64, display: "flex", justifyContent: "space-between" }}>
        <PageBadge page={page} light />
        <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{cat}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 3B — 스플릿 레이아웃 (상단 레드 / 하단 화이트)
// ─────────────────────────────────────────────────
export function Card3B({ data, page, cat }: { data: CardNewsContent["card3"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE }}>
      {/* 상단 레드 영역 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 525, background: R }} />

      {/* 상단 로고 */}
      <div style={{ position: "absolute", top: 52, left: 64 }}>
        <Logo light />
      </div>

      {/* 상단 카테고리 + 타이틀 */}
      <div style={{ position: "absolute", top: 160, left: 64, right: 64 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", marginBottom: 20 }}>
          {data.category}
        </div>
        <div style={{ fontSize: 68, fontWeight: 900, color: W, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          {data.title}
        </div>
      </div>

      {/* 하단 흰 영역 */}
      <div style={{ position: "absolute", top: 525, left: 0, right: 0, bottom: 0, background: W }} />

      {/* 연결 장식 삼각형 */}
      <div style={{ position: "absolute", top: 495, left: 64, width: 0, height: 0, borderLeft: "30px solid transparent", borderRight: "30px solid transparent", borderTop: `30px solid ${R}` }} />

      {/* 하단 본문 */}
      <div style={{ position: "absolute", top: 575, left: 64, right: 64 }}>
        <div style={{ fontSize: 32, fontWeight: 400, color: "#333", lineHeight: 1.8, marginBottom: 40 }}>
          {data.body.replace(/\[\[|\]\]/g, "")}
        </div>

        {/* TIP */}
        <div style={{ borderLeft: `6px solid ${R}`, paddingLeft: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: R, letterSpacing: "0.1em", marginBottom: 10 }}>TIP</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: D, lineHeight: 1.65 }}>{data.tip}</div>
        </div>
      </div>

      {/* 하단 페이지 */}
      <div style={{ position: "absolute", bottom: 52, left: 64, right: 64, display: "flex", justifyContent: "space-between" }}>
        <PageBadge page={page} />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb" }}>{cat}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 4B — 넘버드 리스트 (클린 라인)
// ─────────────────────────────────────────────────
export function Card4B({ data, page, cat }: { data: CardNewsContent["card4"]; page: string; cat: string }) {
  const nums = ["01", "02", "03"];

  return (
    <div style={{ ...BASE, background: W }}>
      {/* 사이드 레드 바 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: R }} />

      {/* 상단 */}
      <div style={{ position: "absolute", top: 52, left: 84, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb" }}>{cat}</span>
      </div>

      {/* 카테고리 */}
      <div style={{ position: "absolute", top: 148, left: 84 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: R, letterSpacing: "0.06em" }}>{data.category}</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: "absolute", top: 243, left: 84, right: 64, fontSize: 64, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
        {data.title}
      </div>

      {/* 구분선 */}
      <div style={{ position: "absolute", top: 500, left: 84, right: 64, height: 2, background: "#EBEBEB" }} />

      {/* 넘버드 아이템 */}
      <div style={{ position: "absolute", top: 550, left: 84, right: 64, display: "flex", flexDirection: "column", gap: 0 }}>
        {data.items.map((item, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 32, paddingBottom: 32 }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: R, lineHeight: 1, minWidth: 72 }}>{nums[i]}</span>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: D, lineHeight: 1.2, marginBottom: 10 }}>{item.title}</div>
                <div style={{ fontSize: 26, fontWeight: 400, color: "#666", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
            {i < data.items.length - 1 && (
              <div style={{ height: 1, background: "#EBEBEB", marginBottom: 32 }} />
            )}
          </div>
        ))}
      </div>

      {/* 하단 */}
      <div style={{ position: "absolute", bottom: 52, left: 84, right: 64, display: "flex", justifyContent: "space-between" }}>
        <PageBadge page={page} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 5B — 다크 CTA (검정 배경 + 레드 버튼)
// ─────────────────────────────────────────────────
export function Card5B({ data, page, cat }: { data: CardNewsContent["card5"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: "#111111" }}>
      {/* 상단 레드 씬 바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: R }} />

      {/* 로고 */}
      <div style={{ position: "absolute", top: 60, right: 64 }}>
        <Logo light />
      </div>

      {/* 중앙 콘텐츠 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" }}>
        {/* 장식 라인 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 52 }}>
          <div style={{ width: 48, height: 4, background: R, borderRadius: 2 }} />
          <div style={{ width: 24, height: 4, background: "rgba(220,38,38,0.4)", borderRadius: 2 }} />
          <div style={{ width: 12, height: 4, background: "rgba(220,38,38,0.2)", borderRadius: 2 }} />
        </div>

        {/* 메인 텍스트 */}
        <div style={{ fontSize: 78, fontWeight: 900, color: W, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 32 }}>
          {data.main}
        </div>

        {/* 서브 */}
        <div style={{ fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 64 }}>
          {data.subtitle}
        </div>

        {/* CTA 버튼 */}
        <div>
          <span style={{ display: "inline-block", background: R, color: W, fontSize: 34, fontWeight: 800, padding: "22px 64px", borderRadius: 8 }}>
            {data.cta}
          </span>
        </div>
      </div>

      {/* 하단 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 64, display: "flex", justifyContent: "space-between" }}>
        <PageBadge page={page} light />
        <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{cat}</span>
      </div>
    </div>
  );
}
