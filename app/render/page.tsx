"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { CardNewsContent } from "@/components/CardTemplates";
import { Card1, Card2, Card3, Card4, Card5 } from "@/components/CardTemplates";
import { Card1B, Card2B, Card3B, Card4B, Card5B } from "@/components/CardTemplatesB";
import { Card1C, Card2C, Card3C, Card4C, Card5C } from "@/components/CardTemplatesC";
import { Card1D, Card2D, Card3D, Card4D, Card5D } from "@/components/CardTemplatesD";

const SCALE = 0.5; // render at half size for screenshot clarity

function RenderCards() {
  const params = useSearchParams();
  const template = params.get("t") ?? "A";
  const raw = params.get("d") ?? "";

  let data: CardNewsContent | null = null;
  try {
    data = JSON.parse(decodeURIComponent(atob(raw))) as CardNewsContent;
  } catch {
    return <div style={{ color: "red", padding: 20 }}>데이터 파싱 오류</div>;
  }

  const cat = data.category ?? "";
  const s = SCALE;

  const cards =
    template === "B"
      ? [
          <Card1B key={0} data={data.card1} page="01" cat={cat} />,
          <Card2B key={1} data={data.card2} page="02" cat={cat} />,
          <Card3B key={2} data={data.card3} page="03" cat={cat} />,
          <Card4B key={3} data={data.card4} page="04" cat={cat} />,
          <Card5B key={4} data={data.card5} page="05" cat={cat} />,
        ]
      : template === "C"
      ? [
          <Card1C key={0} data={data.card1} page="01" cat={cat} />,
          <Card2C key={1} data={data.card2} page="02" cat={cat} />,
          <Card3C key={2} data={data.card3} page="03" cat={cat} />,
          <Card4C key={3} data={data.card4} page="04" cat={cat} />,
          <Card5C key={4} data={data.card5} page="05" cat={cat} />,
        ]
      : template === "D"
      ? [
          <Card1D key={0} data={data.card1} page="01" cat={cat} />,
          <Card2D key={1} data={data.card2} page="02" cat={cat} />,
          <Card3D key={2} data={data.card3} page="03" cat={cat} />,
          <Card4D key={3} data={data.card4} page="04" cat={cat} />,
          <Card5D key={4} data={data.card5} page="05" cat={cat} />,
        ]
      : [
          <Card1 key={0} data={data.card1} page="01" cat={cat} />,
          <Card2 key={1} data={data.card2} page="02" cat={cat} />,
          <Card3 key={2} data={data.card3} page="03" cat={cat} />,
          <Card4 key={3} data={data.card4} page="04" cat={cat} />,
          <Card5 key={4} data={data.card5} page="05" cat={cat} />,
        ];

  return (
    <div style={{ background: "#000", padding: 0, margin: 0 }}>
      {cards.map((card, i) => (
        <div
          key={i}
          id={`card-${i}`}
          style={{
            width: 1080 * s,
            height: 1350 * s,
            overflow: "hidden",
            display: "block",
            position: "relative",
          }}
        >
          <div style={{ transform: `scale(${s})`, transformOrigin: "top left", width: 1080, height: 1350 }}>
            {card}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RenderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RenderCards />
    </Suspense>
  );
}
