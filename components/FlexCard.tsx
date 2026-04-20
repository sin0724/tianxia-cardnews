"use client";

import React from "react";
import type { CardNewsContent } from "./CardTemplates";

export interface FlexElement {
  type: "spacer" | "text" | "divider" | "button" | "box";
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: string;
  background?: string;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  marginTop?: number;
  marginBottom?: number;
  flex?: number;
  height?: number;
  width?: string;
  opacity?: number;
  border?: string;
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
}

export interface FlexCardLayout {
  background: string;
  paddingX: number;
  paddingY: number;
  elements: FlexElement[];
}

export interface StoryboardTemplate {
  id: string;
  name: string;
  cards: [FlexCardLayout, FlexCardLayout, FlexCardLayout, FlexCardLayout, FlexCardLayout];
}

function resolveVars(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] ?? "");
}

function buildVars(
  data: CardNewsContent,
  cardIndex: number,
  page: string,
  cat: string
): Record<string, string> {
  const base = { page, cat };
  switch (cardIndex) {
    case 0:
      return {
        ...base,
        badge: data.card1.badge,
        title_line1: data.card1.title_line1,
        title_line2: data.card1.title_line2,
        subtitle: data.card1.subtitle,
      };
    case 1:
      return {
        ...base,
        label: data.card2.label,
        title: data.card2.title,
        highlight: data.card2.highlight,
        body: data.card2.body,
      };
    case 2:
      return {
        ...base,
        category: data.card3.category,
        title: data.card3.title,
        body: data.card3.body,
        highlight: data.card3.highlight,
        tip: data.card3.tip,
      };
    case 3: {
      const vars: Record<string, string> = {
        ...base,
        category: data.card4.category,
        title: data.card4.title,
      };
      data.card4.items.forEach((item, i) => {
        vars[`items.${i}.tag`] = item.tag;
        vars[`items.${i}.title`] = item.title;
        vars[`items.${i}.desc`] = item.desc;
      });
      return vars;
    }
    case 4:
      return {
        ...base,
        main: data.card5.main,
        subtitle: data.card5.subtitle,
        cta: data.card5.cta,
      };
    default:
      return base;
  }
}

function renderEl(el: FlexElement, vars: Record<string, string>, i: number): React.ReactNode {
  const mt = el.marginTop ?? 0;
  const mb = el.marginBottom ?? 0;

  if (el.type === "spacer") {
    return <div key={i} style={{ flex: el.flex ?? 1 }} />;
  }

  if (el.type === "divider") {
    return (
      <div
        key={i}
        style={{
          marginTop: mt,
          marginBottom: mb,
          height: el.height ?? 2,
          width: el.width ?? "100%",
          background: el.color ?? "rgba(255,255,255,0.3)",
          borderRadius: el.borderRadius ?? 1,
          alignSelf: (el.alignSelf ?? "stretch") as React.CSSProperties["alignSelf"],
          opacity: el.opacity,
          flexShrink: 0,
        }}
      />
    );
  }

  const text = el.content ? resolveVars(el.content, vars) : "";

  const textStyle: React.CSSProperties = {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight as React.CSSProperties["fontWeight"],
    color: el.color,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    opacity: el.opacity,
    width: el.width ?? "100%",
    alignSelf: el.alignSelf as React.CSSProperties["alignSelf"],
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    flexShrink: 0,
  };

  if (el.type === "button") {
    return (
      <div
        key={i}
        style={{
          marginTop: mt,
          marginBottom: mb,
          background: el.background,
          borderRadius: el.borderRadius ?? 12,
          paddingLeft: el.paddingX ?? 40,
          paddingRight: el.paddingX ?? 40,
          paddingTop: el.paddingY ?? 20,
          paddingBottom: el.paddingY ?? 20,
          alignSelf: (el.alignSelf ?? "stretch") as React.CSSProperties["alignSelf"],
          textAlign: el.textAlign ?? "center",
          fontSize: el.fontSize ?? 30,
          fontWeight: (el.fontWeight ?? "700") as React.CSSProperties["fontWeight"],
          color: el.color ?? "#ffffff",
          border: el.border,
          flexShrink: 0,
        }}
      >
        {text}
      </div>
    );
  }

  if (el.type === "box") {
    return (
      <div
        key={i}
        style={{
          marginTop: mt,
          marginBottom: mb,
          background: el.background,
          borderRadius: el.borderRadius ?? 16,
          paddingLeft: el.paddingX ?? 40,
          paddingRight: el.paddingX ?? 40,
          paddingTop: el.paddingY ?? 28,
          paddingBottom: el.paddingY ?? 28,
          border: el.border,
          alignSelf: (el.alignSelf ?? "stretch") as React.CSSProperties["alignSelf"],
          flexShrink: 0,
        }}
      >
        <div style={textStyle}>{text}</div>
      </div>
    );
  }

  return (
    <div key={i} style={{ marginTop: mt, marginBottom: mb, ...textStyle }}>
      {text}
    </div>
  );
}

interface FlexCardProps {
  layout: FlexCardLayout;
  data: CardNewsContent;
  cardIndex: number;
  page: string;
  cat: string;
}

export function FlexCard({ layout, data, cardIndex, page, cat }: FlexCardProps) {
  const vars = buildVars(data, cardIndex, page, cat);
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: layout.background,
        paddingLeft: layout.paddingX,
        paddingRight: layout.paddingX,
        paddingTop: layout.paddingY,
        paddingBottom: layout.paddingY,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {layout.elements.map((el, i) => renderEl(el, vars, i))}
    </div>
  );
}
