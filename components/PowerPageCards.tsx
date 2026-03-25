"use client";

import type { CardNewsContent } from "./CardTemplates";

// 파워페이지 카드: 광고주 사진 배경 + 하단 텍스트 오버레이 (선 없음, 그라디언트 + 텍스트 섀도우)

const R = "#DC2626";
const W = "#FFFFFF";

const BASE: React.CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  fontFamily: "'Noto Sans TC', 'PingFang TC', 'Noto Sans CJK TC', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
};

const TEXT_SHADOW = "0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.7)";

function PhotoBg({ src }: { src?: string }) {
  if (!src) return <div style={{ position: "absolute", inset: 0, background: "#1a1a1a" }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

// 카드 2~5 공통: 하단 그라디언트 + 텍스트 (선 없음)
function BottomText({ label, main }: { label?: string; main: React.ReactNode }) {
  return (
    <>
      {/* 하단 그라디언트 — 자연스럽게 페이드 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 35%, transparent 60%)",
      }} />
      {/* 텍스트: 그라디언트 위에 바로 올라감 */}
      <div style={{
        position: "absolute",
        bottom: 72, left: 72, right: 72,
      }}>
        {label && (
          <div style={{
            fontSize: 24,
            fontWeight: 500,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 14,
            textShadow: TEXT_SHADOW,
          }}>
            {label}
          </div>
        )}
        <div style={{
          fontSize: 52,
          fontWeight: 800,
          color: W,
          lineHeight: 1.2,
          wordBreak: "keep-all",
          textShadow: TEXT_SHADOW,
        }}>
          {main}
        </div>
      </div>
    </>
  );
}

// ── CARD 1: 커버 (썸네일) ──────────────────────────────────────

export function PPCard1({
  data, cat, image,
}: {
  data: CardNewsContent["card1"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      {/* 상단 페이드 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%)",
      }} />
      {/* 하단 페이드 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 45%, transparent 70%)",
      }} />

      {/* 상단: 카테고리 뱃지 */}
      <div style={{ position: "absolute", top: 64, left: 72 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, color: W,
          background: R, padding: "8px 22px", borderRadius: 6,
          textShadow: "none",
        }}>{cat}</span>
      </div>

      {/* 하단 콘텐츠 */}
      <div style={{ position: "absolute", bottom: 96, left: 72, right: 72 }}>
        {/* 서브 뱃지 */}
        <div style={{
          display: "inline-block", fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.75)",
          letterSpacing: 2, textTransform: "uppercase",
          marginBottom: 24, textShadow: TEXT_SHADOW,
        }}>{data.badge}</div>

        {/* 상호명 */}
        <div style={{
          fontSize: 96, fontWeight: 900, color: W,
          lineHeight: 1.0, marginBottom: 22,
          wordBreak: "keep-all", textShadow: TEXT_SHADOW,
        }}>
          {data.title_line1}
        </div>

        {/* 슬로건 */}
        <div style={{
          fontSize: 38, fontWeight: 600, color: "rgba(255,255,255,0.85)",
          marginBottom: 24, textShadow: TEXT_SHADOW,
        }}>
          {data.title_line2}
        </div>

        {/* 서브 */}
        <div style={{
          fontSize: 28, fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.65, textShadow: TEXT_SHADOW,
        }}>
          {data.subtitle}
        </div>
      </div>
    </div>
  );
}

// ── CARD 2: 대표 메뉴 ─────────────────────────────────────────

export function PPCard2({
  data, image,
}: {
  data: CardNewsContent["card2"]; page: string; cat: string; image?: string;
}) {
  const mainText = data.highlight
    ? <>{data.highlight}&ensp;<span style={{ fontWeight: 600, opacity: 0.85 }}>{data.title}</span></>
    : <>{data.title}</>;

  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <BottomText label={data.label} main={mainText} />
    </div>
  );
}

// ── CARD 3: 분위기 / 특징 ─────────────────────────────────────

export function PPCard3({
  data, image,
}: {
  data: CardNewsContent["card3"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <BottomText label={data.category} main={data.title} />
    </div>
  );
}

// ── CARD 4: 메뉴 리스트 ───────────────────────────────────────

export function PPCard4({
  data, image,
}: {
  data: CardNewsContent["card4"]; page: string; cat: string; image?: string;
}) {
  const menuLine = data.items.map((i) => i.title).join("  ·  ");
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <BottomText
        label={data.category}
        main={<span style={{ fontSize: 44, letterSpacing: 1 }}>{menuLine}</span>}
      />
    </div>
  );
}

// ── CARD 5: 방문 안내 ─────────────────────────────────────────

export function PPCard5({
  data, image,
}: {
  data: CardNewsContent["card5"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <BottomText
        label={data.cta}
        main={<span style={{ fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{data.subtitle}</span>}
      />
    </div>
  );
}
