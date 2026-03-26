"use client";

// 템플릿 C — 다이나믹 타이포 (Dynamic Typography)
// 어두운 배경, 강렬한 타이포그래피, 레드 포인트

import type { CardNewsContent } from "./CardTemplates";

const R = "#DC2626";
const D = "#0D0D0D";
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

// ─────────────────────────────────────────────────
// Card 1C — 풀타이포 헤드라인 (커버)
// 검정 배경, 타이틀 라인1 화이트 / 라인2 레드, 아웃라인 뱃지
// ─────────────────────────────────────────────────
export function Card1C({ data, page, cat }: { data: CardNewsContent["card1"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: D }}>
      {/* 대각선 레드 장식선 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: -120, right: 120,
          width: 5, height: 820,
          background: `linear-gradient(to bottom, ${R} 0%, rgba(220,38,38,0.0) 100%)`,
          transform: "rotate(14deg)",
        }} />
        <div style={{
          position: "absolute", top: -120, right: 164,
          width: 2, height: 600,
          background: `linear-gradient(to bottom, rgba(220,38,38,0.35) 0%, transparent 100%)`,
          transform: "rotate(14deg)",
        }} />
      </div>

      {/* 상단 바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, background: R }} />

      {/* 로고 */}
      <div style={{ position: "absolute", top: 50, left: 72 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 32, width: "auto" }} crossOrigin="anonymous" />
      </div>
      <div style={{ position: "absolute", top: 56, right: 72 }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em" }}>{cat}</span>
      </div>

      {/* 아웃라인 뱃지 */}
      <div style={{ position: "absolute", top: 188, left: 72 }}>
        <span style={{
          display: "inline-block",
          border: `2px solid ${R}`,
          color: R,
          fontSize: 24, fontWeight: 700,
          padding: "10px 26px",
          borderRadius: 4,
          letterSpacing: "0.05em",
        }}>
          {data.badge}
        </span>
      </div>

      {/* 타이틀 라인1 — 화이트 */}
      <div style={{ position: "absolute", top: 308, left: 72, right: 72 }}>
        <div style={{
          fontSize: 104, fontWeight: 900, color: W,
          lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: 8,
        }}>
          {data.title_line1}
        </div>
        {/* 타이틀 라인2 — 레드 */}
        <div style={{
          fontSize: 104, fontWeight: 900, color: R,
          lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: 52,
        }}>
          {data.title_line2}
        </div>

        {/* 구분 장식 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 44 }}>
          <div style={{ width: 56, height: 4, background: W, borderRadius: 2 }} />
          <div style={{ width: 10, height: 10, background: R, borderRadius: "50%" }} />
          <div style={{ width: 28, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
        </div>

        {/* 서브타이틀 */}
        <div style={{ fontSize: 33, fontWeight: 400, color: "rgba(255,255,255,0.62)", lineHeight: 1.75 }}>
          {data.subtitle}
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.28)" }}>{page}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 2C — 분위기형 헤드라인 (후킹)
// 무드 그라디언트, 동심원 장식, 중앙 제목
// ─────────────────────────────────────────────────
export function Card2C({ data, page, cat }: { data: CardNewsContent["card2"]; page: string; cat: string }) {
  const parts = data.highlight ? data.title.split(data.highlight) : [data.title];
  return (
    <div style={{ ...BASE, background: "linear-gradient(158deg, #1a0404 0%, #0D0D0D 45%, #070714 100%)" }}>
      {/* 동심원 장식 */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 960, height: 960, borderRadius: "50%", border: "1px solid rgba(220,38,38,0.10)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 720, height: 720, borderRadius: "50%", border: "1px solid rgba(220,38,38,0.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(220,38,38,0.05)", pointerEvents: "none" }} />

      {/* 상단 로고 + 라벨 */}
      <div style={{ position: "absolute", top: 64, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
        <span style={{ fontSize: 22, fontWeight: 700, color: R, letterSpacing: "0.08em" }}>{data.label}</span>
      </div>

      {/* 상단 구분선 */}
      <div style={{ position: "absolute", top: 310, left: 72, right: 72, height: 1, background: "rgba(255,255,255,0.08)" }} />

      {/* 메인 타이틀 */}
      <div style={{ position: "absolute", top: 340, left: 72, right: 72 }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: W, lineHeight: 1.28, letterSpacing: "-0.025em" }}>
          {parts.length > 1 ? (
            <>
              {parts[0]}
              <span style={{ color: R }}>{data.highlight}</span>
              {parts[1]}
            </>
          ) : data.title}
        </div>
      </div>

      {/* 레드 도트 + 하단 구분선 */}
      <div style={{ position: "absolute", top: 855, left: 72, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 10, height: 10, background: R, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ width: 900, height: 1, background: "rgba(255,255,255,0.1)" }} />
      </div>

      {/* 본문 */}
      <div style={{ position: "absolute", top: 896, left: 72, right: 72, fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.58)", lineHeight: 1.78 }}>
        {data.body}
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.24)" }}>{page}</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.24)" }}>{cat}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 3C — 하단집중 (인사이트)
// 상단 어두운 도트패턴 영역 / 하단 화이트 콘텐츠 집중
// ─────────────────────────────────────────────────
export function Card3C({ data, page, cat }: { data: CardNewsContent["card3"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE }}>
      {/* 상단 다크 영역 — 50% */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 675, background: D, overflow: "hidden" }}>
        {/* 도트 그리드 */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(rgba(220,38,38,0.18) 1.5px, transparent 1.5px)`,
          backgroundSize: "52px 52px",
        }} />
        {/* 페이드 마스크 */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: `linear-gradient(to top, ${D}, transparent)` }} />

        {/* 큰 장식 글자 */}
        <div style={{
          position: "absolute", bottom: 40, right: 56,
          fontSize: 280, fontWeight: 900,
          color: "rgba(255,255,255,0.03)",
          lineHeight: 1, letterSpacing: "-0.05em",
          pointerEvents: "none",
        }}>
          {data.category.slice(0, 2)}
        </div>

        {/* 로고 */}
        <div style={{ position: "absolute", top: 56, left: 72 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
        </div>

        {/* 카테고리 + 타이틀 — 하단 집중 */}
        <div style={{ position: "absolute", bottom: 68, left: 72, right: 72 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: R, letterSpacing: "0.06em", marginBottom: 18 }}>{data.category}</div>
          <div style={{ fontSize: 70, fontWeight: 900, color: W, lineHeight: 1.15, letterSpacing: "-0.025em" }}>
            {data.title}
          </div>
        </div>
      </div>

      {/* 하단 화이트 영역 — 50% */}
      <div style={{ position: "absolute", top: 675, left: 0, right: 0, bottom: 0, background: W }}>
        <div style={{ padding: "44px 72px 80px" }}>
          <div style={{ fontSize: 31, fontWeight: 400, color: "#333", lineHeight: 1.82, marginBottom: 36 }}>
            {data.body.replace(/\[\[|\]\]/g, "")}
          </div>
          {data.tip && (
            <div style={{ background: "#F5F5F5", borderLeft: `5px solid ${R}`, padding: "22px 28px", borderRadius: "0 10px 10px 0" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: R, letterSpacing: "0.1em", marginRight: 12 }}>TIP</span>
              <span style={{ fontSize: 27, fontWeight: 500, color: "#333", lineHeight: 1.65 }}>{data.tip}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ position: "absolute", bottom: 28, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#ccc" }}>{page}</span>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#ccc" }}>{cat}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 4C — 스텝형 (리스트)
// 화이트 배경, 번호 원형 + 연결선, 스텝 레이아웃
// ─────────────────────────────────────────────────
export function Card4C({ data, page, cat }: { data: CardNewsContent["card4"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: W }}>
      {/* 왼쪽 레드 사이드바 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: R }} />

      {/* 상단 */}
      <div style={{ position: "absolute", top: 52, left: 88, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb" }}>{cat}</span>
      </div>

      {/* 카테고리 */}
      <div style={{ position: "absolute", top: 148, left: 88 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: R, letterSpacing: "0.06em" }}>{data.category}</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: "absolute", top: 208, left: 88, right: 72, fontSize: 62, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.025em" }}>
        {data.title}
      </div>

      {/* 구분선 */}
      <div style={{ position: "absolute", top: 488, left: 88, right: 72, height: 2, background: "#EBEBEB" }} />

      {/* 스텝 아이템 */}
      <div style={{ position: "absolute", top: 530, left: 88, right: 72 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 36, marginBottom: i < data.items.length - 1 ? 0 : 0 }}>
            {/* 왼쪽 스텝 컬럼 (번호 + 연결선) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              {/* 원형 번호 */}
              <div style={{
                width: 60, height: 60,
                background: R, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 900, color: W,
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              {/* 연결선 */}
              {i < data.items.length - 1 && (
                <div style={{ width: 2, height: 72, background: "#EBEBEB", margin: "8px 0" }} />
              )}
            </div>

            {/* 콘텐츠 */}
            <div style={{ paddingTop: 8, paddingBottom: i < data.items.length - 1 ? 0 : 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: R, letterSpacing: "0.04em", marginBottom: 8 }}>{item.tag}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: D, lineHeight: 1.2, marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 27, fontWeight: 400, color: "#555", lineHeight: 1.55 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 88, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "#ccc" }}>{page}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 5C — 인용구형 CTA
// 다크 배경, 큰 따옴표 장식, CTA 텍스트를 인용구처럼
// ─────────────────────────────────────────────────
export function Card5C({ data, page, cat }: { data: CardNewsContent["card5"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: "#0A0A0A" }}>
      {/* 큰 장식 따옴표 — 뒤 */}
      <div style={{
        position: "absolute", top: 30, left: 40,
        fontSize: 480, fontWeight: 900,
        color: `rgba(220,38,38,0.08)`,
        lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif",
        pointerEvents: "none",
        userSelect: "none",
      }}>
        "
      </div>

      {/* 로고 */}
      <div style={{ position: "absolute", top: 60, right: 72 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
      </div>

      {/* 중앙 콘텐츠 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 84px 80px 84px" }}>
        {/* 레드 장식 선 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 56 }}>
          <div style={{ width: 52, height: 4, background: R, borderRadius: 2 }} />
          <div style={{ width: 26, height: 4, background: "rgba(220,38,38,0.45)", borderRadius: 2 }} />
          <div style={{ width: 13, height: 4, background: "rgba(220,38,38,0.2)", borderRadius: 2 }} />
        </div>

        {/* 메인 텍스트 — 인용구 스타일 */}
        <div style={{ fontSize: 80, fontWeight: 900, color: W, lineHeight: 1.2, letterSpacing: "-0.025em", marginBottom: 36 }}>
          {data.main}
        </div>

        {/* 서브 */}
        <div style={{ fontSize: 33, fontWeight: 400, color: "rgba(255,255,255,0.58)", lineHeight: 1.72, marginBottom: 68 }}>
          {data.subtitle}
        </div>

        {/* CTA — 아웃라인 버튼 */}
        <div>
          <span style={{
            display: "inline-block",
            border: `2px solid ${W}`,
            color: W,
            fontSize: 34, fontWeight: 800,
            padding: "20px 64px",
            borderRadius: 8,
          }}>
            {data.cta}
          </span>
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 84, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.24)" }}>{page}</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.24)" }}>{cat}</span>
      </div>
    </div>
  );
}
