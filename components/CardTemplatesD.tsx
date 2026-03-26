"use client";

// 템플릿 D — 클린 레이아웃 (Clean Layout)
// 화이트/라이트 배경, 구조적 레이아웃, 다양한 정렬

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

// ─────────────────────────────────────────────────
// Card 1D — 상단집중 커버
// 화이트 배경, 상단 50% 콘텐츠 집중, 하단 워터마크 장식
// ─────────────────────────────────────────────────
export function Card1D({ data, page, cat }: { data: CardNewsContent["card1"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: W }}>
      {/* 상단 레드 풀바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: R }} />

      {/* 로고 + 카테고리 */}
      <div style={{ position: "absolute", top: 50, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고.png" alt="TIANXIA" style={{ height: 32, width: "auto" }} crossOrigin="anonymous" />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb", letterSpacing: "0.08em" }}>{cat}</span>
      </div>

      {/* 뱃지 */}
      <div style={{ position: "absolute", top: 178, left: 72 }}>
        <span style={{ background: R, color: W, fontSize: 24, fontWeight: 700, padding: "10px 26px", borderRadius: 6 }}>
          {data.badge}
        </span>
      </div>

      {/* 타이틀 — 상단 집중 */}
      <div style={{ position: "absolute", top: 280, left: 72, right: 72 }}>
        <div style={{ fontSize: 98, fontWeight: 900, color: D, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 10 }}>
          {data.title_line1}
        </div>
        <div style={{ fontSize: 98, fontWeight: 900, color: R, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          {data.title_line2}
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ position: "absolute", top: 732, left: 72, width: 80, height: 4, background: D }} />

      {/* 서브타이틀 */}
      <div style={{ position: "absolute", top: 774, left: 72, right: 72, fontSize: 33, fontWeight: 400, color: "#555", lineHeight: 1.72 }}>
        {data.subtitle}
      </div>

      {/* 하단 워터마크 장식 글자 */}
      <div style={{
        position: "absolute", bottom: -30, right: -20,
        fontSize: 340, fontWeight: 900,
        color: "rgba(0,0,0,0.04)",
        lineHeight: 1, letterSpacing: "-0.06em",
        pointerEvents: "none", userSelect: "none",
      }}>
        {data.title_line1.slice(0, 2)}
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "#ddd" }}>{page}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 2D — 좌우 스플릿 (후킹)
// 좌측 레드 패널(라벨/장식) + 우측 다크 패널(제목/본문)
// ─────────────────────────────────────────────────
export function Card2D({ data, page, cat }: { data: CardNewsContent["card2"]; page: string; cat: string }) {
  const SPLIT = 320;
  const parts = data.highlight ? data.title.split(data.highlight) : [data.title];
  return (
    <div style={{ ...BASE }}>
      {/* 좌측 레드 패널 */}
      <div style={{ position: "absolute", top: 0, left: 0, width: SPLIT, bottom: 0, background: R, overflow: "hidden" }}>
        {/* 세로 라벨 텍스트 */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%) rotate(-90deg)",
          fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.14em", whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}>
          {data.label}
        </div>
        {/* 상단 로고 */}
        <div style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/티엔샤로고-white.png" alt="TIANXIA" style={{ height: 28, width: "auto" }} crossOrigin="anonymous" />
        </div>
        {/* 하단 레드 장식선들 */}
        <div style={{ position: "absolute", bottom: 80, left: 36, right: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
          <div style={{ height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
        </div>
      </div>

      {/* 우측 다크 패널 */}
      <div style={{ position: "absolute", top: 0, left: SPLIT, right: 0, bottom: 0, background: "#141414", overflow: "hidden" }}>
        {/* 상단 카테고리 */}
        <div style={{ position: "absolute", top: 64, left: 56, right: 40 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{cat}</span>
        </div>

        {/* 메인 타이틀 */}
        <div style={{ position: "absolute", top: 200, left: 56, right: 40 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: W, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            {parts.length > 1 ? (
              <>
                {parts[0]}
                <span style={{ color: R }}>{data.highlight}</span>
                {parts[1]}
              </>
            ) : data.title}
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ position: "absolute", top: 780, left: 56, right: 40, height: 1, background: "rgba(255,255,255,0.1)" }} />

        {/* 본문 */}
        <div style={{ position: "absolute", top: 820, left: 56, right: 40, fontSize: 30, fontWeight: 400, color: "rgba(255,255,255,0.58)", lineHeight: 1.78 }}>
          {data.body}
        </div>

        {/* 푸터 */}
        <div style={{ position: "absolute", bottom: 52, left: 56, right: 40 }}>
          <span style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.22)" }}>{page}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 3D — 중앙집중 (인사이트)
// 연그레이 배경, 레드 보더 박스, 내부 콘텐츠 집중
// ─────────────────────────────────────────────────
export function Card3D({ data, page, cat }: { data: CardNewsContent["card3"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: "#F2F2F2" }}>
      {/* 레드 보더 프레임 */}
      <div style={{
        position: "absolute",
        top: 84, left: 60, right: 60, bottom: 84,
        border: `3px solid rgba(220,38,38,0.25)`,
        borderRadius: 20,
        pointerEvents: "none",
      }} />

      {/* 코너 장식 — 좌상 */}
      <div style={{ position: "absolute", top: 60, left: 36, width: 48, height: 48, borderTop: `4px solid ${R}`, borderLeft: `4px solid ${R}` }} />
      {/* 코너 장식 — 우하 */}
      <div style={{ position: "absolute", bottom: 60, right: 36, width: 48, height: 48, borderBottom: `4px solid ${R}`, borderRight: `4px solid ${R}` }} />

      {/* 로고 */}
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
      </div>

      {/* 내부 콘텐츠 — 중앙집중 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 96px" }}>
        {/* 카테고리 */}
        <div style={{ fontSize: 24, fontWeight: 700, color: R, letterSpacing: "0.06em", textAlign: "center", marginBottom: 24 }}>
          {data.category}
        </div>

        {/* 상단 구분 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 3, background: D, borderRadius: 2 }} />
        </div>

        {/* 타이틀 */}
        <div style={{ fontSize: 68, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.025em", textAlign: "center", marginBottom: 40 }}>
          {data.title}
        </div>

        {/* 하단 구분 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div style={{ width: 100, height: 1, background: "#ccc" }} />
        </div>

        {/* 본문 */}
        <div style={{ fontSize: 31, fontWeight: 400, color: "#444", lineHeight: 1.82, textAlign: "center", marginBottom: 40 }}>
          {data.body.replace(/\[\[|\]\]/g, "")}
        </div>

        {/* TIP */}
        {data.tip && (
          <div style={{ background: R, borderRadius: 12, padding: "24px 36px", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", marginBottom: 10 }}>TIP</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: W, lineHeight: 1.6 }}>{data.tip}</div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#aaa" }}>{page}</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#aaa" }}>{cat}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 4D — 번호목록형 변형 (리스트)
// 화이트 배경, 큰 배경 숫자 + 전경 콘텐츠
// ─────────────────────────────────────────────────
export function Card4D({ data, page, cat }: { data: CardNewsContent["card4"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: W }}>
      {/* 상단 레드 씬 바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: R }} />

      {/* 로고 + 카테고리 */}
      <div style={{ position: "absolute", top: 50, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
        <span style={{ fontSize: 22, fontWeight: 600, color: "#bbb", letterSpacing: "0.06em" }}>{cat}</span>
      </div>

      {/* 카테고리 라벨 */}
      <div style={{ position: "absolute", top: 148, left: 72 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: R, letterSpacing: "0.06em" }}>{data.category}</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: "absolute", top: 204, left: 72, right: 72, fontSize: 58, fontWeight: 900, color: D, lineHeight: 1.2, letterSpacing: "-0.025em" }}>
        {data.title}
      </div>

      {/* 구분선 */}
      <div style={{ position: "absolute", top: 480, left: 72, right: 72, height: 2, background: "#EBEBEB" }} />

      {/* 번호 목록 아이템 — 큰 배경 숫자 + 전경 콘텐츠 */}
      <div style={{ position: "absolute", top: 510, left: 72, right: 72 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 52, overflow: "hidden" }}>
            {/* 배경 대형 숫자 */}
            <div style={{
              position: "absolute",
              top: -28, left: -14,
              fontSize: 170, fontWeight: 900,
              color: "rgba(220,38,38,0.07)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              pointerEvents: "none", userSelect: "none",
            }}>
              {String(i + 1).padStart(2, "0")}
            </div>

            {/* 전경 콘텐츠 */}
            <div style={{ position: "relative", paddingLeft: 100 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: R, letterSpacing: "0.04em", marginBottom: 8 }}>{item.tag}</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: D, lineHeight: 1.2, marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 27, fontWeight: 400, color: "#555", lineHeight: 1.55 }}>{item.desc}</div>
            </div>

            {/* 아이템 하단선 */}
            {i < data.items.length - 1 && (
              <div style={{ position: "relative", marginTop: 20, height: 1, background: "#EBEBEB" }} />
            )}
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "#ccc" }}>{page}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Card 5D — 풀타이포 CTA
// 라이트 배경, 메인 텍스트가 카드를 꽉 채우는 임팩트
// ─────────────────────────────────────────────────
export function Card5D({ data, page, cat }: { data: CardNewsContent["card5"]; page: string; cat: string }) {
  return (
    <div style={{ ...BASE, background: "#FAFAFA" }}>
      {/* 상단 레드 풀바 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: R }} />

      {/* 로고 */}
      <div style={{ position: "absolute", top: 48, right: 72 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/티엔샤로고.png" alt="TIANXIA" style={{ height: 30, width: "auto" }} crossOrigin="anonymous" />
      </div>

      {/* 중앙 — 풀타이포 콘텐츠 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "80px 72px" }}>
        {/* 레드 장식 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 52 }}>
          <div style={{ width: 52, height: 5, background: R, borderRadius: 2 }} />
          <div style={{ width: 26, height: 5, background: "rgba(220,38,38,0.35)", borderRadius: 2 }} />
          <div style={{ width: 13, height: 5, background: "rgba(220,38,38,0.15)", borderRadius: 2 }} />
        </div>

        {/* 메인 텍스트 — 풀타이포 임팩트 */}
        <div style={{ fontSize: 108, fontWeight: 900, color: D, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: 44 }}>
          {data.main}
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: 1, background: "#e0e0e0", marginBottom: 44 }} />

        {/* 서브타이틀 */}
        <div style={{ fontSize: 33, fontWeight: 400, color: "#666", lineHeight: 1.72, marginBottom: 64 }}>
          {data.subtitle}
        </div>

        {/* CTA 버튼 — 레드 필드 */}
        <div>
          <span style={{ display: "inline-block", background: R, color: W, fontSize: 34, fontWeight: 800, padding: "22px 68px", borderRadius: 60 }}>
            {data.cta}
          </span>
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "#ccc" }}>{page}</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#ccc" }}>{cat}</span>
      </div>
    </div>
  );
}
