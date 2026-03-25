"use client";

import type { CardNewsContent } from "./CardTemplates";

// 파워페이지 카드: 광고주 사진 배경 + 최소한의 하단 텍스트 오버레이

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

// 카드 2~5 공통: 하단 한 줄 스트립
function BottomStrip({ label, main }: { label?: string; main: React.ReactNode }) {
  return (
    <>
      {/* 하단 그라디언트 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 30%, transparent 55%)",
      }} />
      {/* 스트립 */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        borderTop: `4px solid ${R}`,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(6px)",
        padding: "36px 72px 44px",
      }}>
        {label && (
          <div style={{
            fontSize: 26, fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 1, marginBottom: 10,
          }}>
            {label}
          </div>
        )}
        <div style={{
          fontSize: 50, fontWeight: 800,
          color: W, lineHeight: 1.2,
          wordBreak: "keep-all",
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
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%)",
      }} />
      {/* 하단 페이드 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, transparent 70%)",
      }} />

      {/* 상단: 카테고리 뱃지만 */}
      <div style={{ position: "absolute", top: 64, left: 72 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, color: W,
          background: R, padding: "8px 22px", borderRadius: 6,
        }}>{cat}</span>
      </div>

      {/* 하단 콘텐츠 */}
      <div style={{ position: "absolute", bottom: 100, left: 72, right: 72 }}>
        {/* 서브 뱃지 */}
        <div style={{
          display: "inline-block", fontSize: 26, fontWeight: 700, color: W,
          border: `2px solid rgba(255,255,255,0.4)`,
          padding: "6px 20px", borderRadius: 40, marginBottom: 28,
        }}>{data.badge}</div>

        {/* 상호명 */}
        <div style={{
          fontSize: 96, fontWeight: 900, color: W,
          lineHeight: 1.0, marginBottom: 24, wordBreak: "keep-all",
        }}>
          {data.title_line1}
        </div>

        {/* 슬로건: 레드 좌측 바 */}
        <div style={{
          fontSize: 40, fontWeight: 700, color: W,
          borderLeft: `5px solid ${R}`, paddingLeft: 20,
          marginBottom: 28,
        }}>{data.title_line2}</div>

        {/* 한 줄 서브 */}
        <div style={{
          fontSize: 30, fontWeight: 400,
          color: "rgba(255,255,255,0.7)", lineHeight: 1.6,
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
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <BottomStrip
        label={data.label}
        main={
          <>
            {data.highlight && (
              <span style={{
                background: R, color: W,
                fontSize: 32, fontWeight: 700,
                padding: "2px 14px", borderRadius: 4,
                marginRight: 16, verticalAlign: "middle",
              }}>{data.highlight}</span>
            )}
            <span>{data.title}</span>
          </>
        }
      />
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
      <BottomStrip
        label={data.category}
        main={data.title}
      />
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
      <BottomStrip
        label={data.category}
        main={<span style={{ fontSize: 42 }}>{menuLine}</span>}
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
      <BottomStrip
        label={data.cta}
        main={<span style={{ fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{data.subtitle}</span>}
      />
    </div>
  );
}
