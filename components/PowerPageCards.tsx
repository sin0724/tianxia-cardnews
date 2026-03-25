"use client";

import type { CardNewsContent } from "./CardTemplates";

// 파워페이지 카드: 광고주 사진을 배경으로 하고 번체 중문 텍스트를 오버레이

const R = "#DC2626";
const W = "#FFFFFF";

const BASE: React.CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  fontFamily: "'Noto Sans TC', 'PingFang TC', 'Noto Sans CJK TC', 'Apple SD Gothic Neo', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
};

function PhotoBg({ src }: { src?: string }) {
  if (!src) {
    return <div style={{ position: "absolute", inset: 0, background: "#111" }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function Grad({ style }: { style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, ...style }} />;
}

function Footer({ page, cat }: { page: string; cat: string }) {
  return (
    <div style={{ position: "absolute", bottom: 52, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 26, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{page}</span>
      <span style={{ fontSize: 26, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{cat}</span>
    </div>
  );
}

// ── CARD 1 ────────────────────────────────────────────────────

export function PPCard1({
  data, page, cat, image,
}: {
  data: CardNewsContent["card1"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      {/* 상단 약한 그라디언트 */}
      <Grad style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%)" }} />
      {/* 하단 강한 그라디언트 */}
      <Grad style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 45%, transparent 70%)" }} />

      {/* 상단: 카테고리 */}
      <div style={{ position: "absolute", top: 64, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 2 }}>TIANXIA</span>
        <span style={{
          fontSize: 24, fontWeight: 700, color: W,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
          padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.3)",
        }}>{cat}</span>
      </div>

      {/* 하단 콘텐츠 */}
      <div style={{ position: "absolute", bottom: 120, left: 72, right: 72 }}>
        {/* 뱃지 */}
        <div style={{
          display: "inline-block", fontSize: 26, fontWeight: 700, color: W,
          background: R, padding: "8px 24px", borderRadius: 8, marginBottom: 28,
        }}>{data.badge}</div>

        {/* 상호명 */}
        <div style={{ fontSize: 100, fontWeight: 900, color: W, lineHeight: 1.05, marginBottom: 20, wordBreak: "keep-all" }}>
          {data.title_line1}
        </div>

        {/* 슬로건 */}
        <div style={{
          fontSize: 44, fontWeight: 700, color: W,
          background: "rgba(220,38,38,0.85)", display: "inline-block",
          padding: "6px 20px", borderRadius: 6, marginBottom: 28,
        }}>{data.title_line2}</div>

        {/* 서브타이틀 */}
        <div style={{ fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
          {data.subtitle}
        </div>
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ── CARD 2 ────────────────────────────────────────────────────

export function PPCard2({
  data, page, cat, image,
}: {
  data: CardNewsContent["card2"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <Grad style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%)" }} />
      <Grad style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, transparent 75%)" }} />

      {/* 상단 라벨 */}
      <div style={{ position: "absolute", top: 64, left: 72 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.8)",
          borderBottom: `3px solid ${R}`, paddingBottom: 6, letterSpacing: 2,
        }}>{data.label}</span>
      </div>

      {/* 하단 콘텐츠 */}
      <div style={{ position: "absolute", bottom: 120, left: 72, right: 72 }}>
        {/* 하이라이트 키워드 */}
        <div style={{
          display: "inline-block", fontSize: 30, fontWeight: 800, color: W,
          background: R, padding: "8px 22px", borderRadius: 6, marginBottom: 24,
        }}>{data.highlight}</div>

        {/* 메뉴 제목 */}
        <div style={{ fontSize: 68, fontWeight: 900, color: W, lineHeight: 1.15, marginBottom: 28, wordBreak: "keep-all" }}>
          {data.title}
        </div>

        {/* 구분선 */}
        <div style={{ width: 60, height: 4, background: R, marginBottom: 28, borderRadius: 2 }} />

        {/* 본문 */}
        <div style={{ fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, wordBreak: "keep-all" }}>
          {data.body}
        </div>
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ── CARD 3 ────────────────────────────────────────────────────

export function PPCard3({
  data, page, cat, image,
}: {
  data: CardNewsContent["card3"]; page: string; cat: string; image?: string;
}) {
  const parts = data.highlight
    ? data.body.split(`[[${data.highlight}]]`)
    : [data.body];

  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      {/* 전체적으로 약간 어둡게 */}
      <Grad style={{ background: "rgba(0,0,0,0.45)" }} />
      <Grad style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 25%)" }} />
      <Grad style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />

      {/* 상단 카테고리 */}
      <div style={{ position: "absolute", top: 64, left: 72 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, color: W,
          background: R, padding: "8px 22px", borderRadius: 6,
        }}>{data.category}</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: "absolute", top: 180, left: 72, right: 72 }}>
        <div style={{ fontSize: 62, fontWeight: 900, color: W, lineHeight: 1.2, wordBreak: "keep-all" }}>
          {data.title}
        </div>
      </div>

      {/* 하단 콘텐츠 박스 */}
      <div style={{
        position: "absolute", bottom: 110, left: 72, right: 72,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
        borderRadius: 20, padding: "44px 48px",
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        {/* 본문 */}
        <div style={{ fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.9)", lineHeight: 1.75, marginBottom: 28, wordBreak: "keep-all" }}>
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 && (
                <span style={{ background: R, color: W, padding: "0 8px", borderRadius: 4, fontWeight: 700 }}>
                  {data.highlight}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* TIP 박스 */}
        {data.tip && (
          <div style={{
            background: "rgba(220,38,38,0.85)", borderRadius: 10,
            padding: "20px 28px",
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: W, marginRight: 12 }}>💡 TIP</span>
            <span style={{ fontSize: 28, fontWeight: 500, color: W }}>{data.tip}</span>
          </div>
        )}
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ── CARD 4 ────────────────────────────────────────────────────

export function PPCard4({
  data, page, cat, image,
}: {
  data: CardNewsContent["card4"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      <Grad style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%)" }} />
      <Grad style={{ background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 45%, transparent 70%)" }} />

      {/* 상단 카테고리 */}
      <div style={{ position: "absolute", top: 64, left: 72 }}>
        <span style={{
          fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.8)",
          borderBottom: `3px solid ${R}`, paddingBottom: 6, letterSpacing: 2,
        }}>{data.category}</span>
      </div>

      {/* 타이틀 */}
      <div style={{ position: "absolute", bottom: 530, left: 72, right: 72 }}>
        <div style={{ fontSize: 54, fontWeight: 900, color: W, lineHeight: 1.2, wordBreak: "keep-all" }}>
          {data.title}
        </div>
        <div style={{ width: 60, height: 4, background: R, marginTop: 20, borderRadius: 2 }} />
      </div>

      {/* 메뉴 아이템 리스트 */}
      <div style={{ position: "absolute", bottom: 110, left: 72, right: 72, display: "flex", flexDirection: "column", gap: 16 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 24,
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
            borderRadius: 14, padding: "22px 28px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            {/* 번호 배지 */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: R,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: W }}>{i + 1}</span>
            </div>
            {/* 태그 + 제목 + 설명 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{item.tag}</span>
                <span style={{ fontSize: 34, fontWeight: 800, color: W }}>{item.title}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 400, color: "rgba(255,255,255,0.75)" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}

// ── CARD 5 ────────────────────────────────────────────────────

export function PPCard5({
  data, page, cat, image,
}: {
  data: CardNewsContent["card5"]; page: string; cat: string; image?: string;
}) {
  return (
    <div style={BASE}>
      <PhotoBg src={image} />
      {/* 강한 어두운 오버레이 */}
      <Grad style={{ background: "rgba(0,0,0,0.65)" }} />
      <Grad style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }} />

      {/* 상단 로고 */}
      <div style={{ position: "absolute", top: 64, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2 }}>TIANXIA</span>
        <span style={{
          fontSize: 24, fontWeight: 700, color: W,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
          padding: "8px 20px", borderRadius: 40, border: "1px solid rgba(255,255,255,0.3)",
        }}>{cat}</span>
      </div>

      {/* 중앙 메인 */}
      <div style={{
        position: "absolute", top: "38%", left: 72, right: 72,
        transform: "translateY(-50%)",
      }}>
        <div style={{ fontSize: 86, fontWeight: 900, color: W, lineHeight: 1.1, textAlign: "center", wordBreak: "keep-all", marginBottom: 20 }}>
          {data.main}
        </div>
      </div>

      {/* 하단 콘텐츠 */}
      <div style={{ position: "absolute", bottom: 130, left: 72, right: 72 }}>
        {/* 주소 박스 */}
        <div style={{
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
          borderRadius: 14, padding: "24px 32px", marginBottom: 28,
          border: "1px solid rgba(255,255,255,0.2)",
        }}>
          <div style={{ fontSize: 30, fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, wordBreak: "keep-all" }}>
            {data.subtitle}
          </div>
        </div>

        {/* CTA 버튼 */}
        <div style={{
          background: R, borderRadius: 14, padding: "28px 48px",
          textAlign: "center",
        }}>
          <span style={{ fontSize: 40, fontWeight: 900, color: W, letterSpacing: 2 }}>
            {data.cta}
          </span>
        </div>
      </div>

      <Footer page={page} cat={cat} />
    </div>
  );
}
