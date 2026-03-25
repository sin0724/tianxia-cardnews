"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import {
  Card1, Card2, Card3, Card4, Card5,
  type CardNewsContent,
} from "@/components/CardTemplates";
import { Card1B, Card2B, Card3B, Card4B, Card5B } from "@/components/CardTemplatesB";
import {
  DynCard1, DynCard2, DynCard3, DynCard4, DynCard5,
  type CardStyleConfig,
} from "@/components/DynamicCards";

// ─── 기본 추천 주제 ──────────────────────────────────────────
const DEFAULT_TOPICS = [
  "대만 MZ세대 SNS 트렌드",
  "대만 뷰티 시장 진출 전략",
  "대만 식품 유통 채널 분석",
  "대만 K-콘텐츠 인기 현황",
  "대만 이커머스 플랫폼 비교",
  "대만 브랜드 마케팅 성공 사례",
];

const SCALE = 0.25;
const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_W = Math.round(CARD_W * SCALE);
const PREVIEW_H = Math.round(CARD_H * SCALE);
const CARD_LABELS = ["01 커버", "02 후킹", "03 인사이트", "04 리스트", "05 CTA"];
const EDIT_TABS = ["카드 1", "카드 2", "카드 3", "카드 4", "카드 5", "캡션"] as const;
type EditTab = typeof EDIT_TABS[number];

const BUILTIN_TEMPLATES = [
  { id: "A", name: "레드 클래식", desc: "풀 컬러 배경" },
  { id: "B", name: "에디토리얼", desc: "화이트 기반 편집체" },
] as const;

const STORAGE_KEY = "tianxia_custom_templates";
const API_KEY_STORAGE = "tianxia_api_key";

interface TrendsResult {
  suggestions: string[];
  rawTrends: string[];
  fetchedAt: string;
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<CardNewsContent | null>(null);
  const [caption, setCaption] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedId, setSelectedId] = useState<string>("A");
  const [customTemplates, setCustomTemplates] = useState<CardStyleConfig[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("카드 1");

  // 템플릿 업로드 모달
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API 키 설정
  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsResult | null>(null);
  const [trendsError, setTrendsError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  // 블로그 원고
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState("");
  const [blogResult, setBlogResult] = useState<{ title: string; summary: string; content: string; tags: string[] } | null>(null);
  const [blogCopied, setBlogCopied] = useState(false);

  const captureRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  // localStorage에서 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCustomTemplates(JSON.parse(saved));
    } catch { /* ignore */ }

    const savedKey = localStorage.getItem(API_KEY_STORAGE) ?? "";
    setApiKey(savedKey);
    setApiKeyInput(savedKey);
    if (!savedKey) setSettingsOpen(true); // 키 없으면 자동으로 설정창 열기
  }, []);

  function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim();
    setApiKey(trimmed);
    try { localStorage.setItem(API_KEY_STORAGE, trimmed); } catch { /* ignore */ }
    setSettingsOpen(false);
  }

  /** 모든 API 요청에 사용할 공통 헤더 */
  function apiHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-user-api-key": apiKey } : {}),
      ...extra,
    };
  }

  function saveCustomTemplates(templates: CardStyleConfig[]) {
    setCustomTemplates(templates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // ignore
    }
  }

  // ── 트렌드 ─────────────────────────────────────────────────
  async function handleFetchTrends() {
    setTrendsError("");
    setTrendsLoading(true);
    try {
      const res = await fetch("/api/trends", { headers: apiHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "트렌드 불러오기 실패");
      setTrendsData(data);
    } catch (e) {
      setTrendsError(e instanceof Error ? e.message : "트렌드 불러오기 실패");
    } finally {
      setTrendsLoading(false);
    }
  }

  // ── 콘텐츠 생성 ────────────────────────────────────────────
  async function handleGenerate() {
    if (!topic.trim()) { setError("주제를 입력해주세요."); return; }
    setError("");
    setLoading(true);
    setContent(null);
    setCaption("");
    setEditOpen(false);
    try {
      const res = await fetch("/api/cardnews/generate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 오류");
      setContent(data);
      setCaption(data.caption ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ── 텍스트 편집 ─────────────────────────────────────────────
  function updateContent(path: string, value: string) {
    if (!content) return;
    const keys = path.split(".");
    const updated = JSON.parse(JSON.stringify(content)) as CardNewsContent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      obj = isNaN(Number(k)) ? obj[k] : obj[Number(k)];
    }
    const last = keys[keys.length - 1];
    if (isNaN(Number(last))) obj[last] = value;
    else obj[Number(last)] = value;
    setContent(updated);
  }

  // ── 이미지 파일 선택 ────────────────────────────────────────
  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadPreview(result);
      // data:image/xxx;base64,... → base64 부분만 추출
      const [header, base64] = result.split(",");
      const mediaType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
      setUploadData({ base64, mediaType });
      setAnalyzeError("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);

  // ── 스타일 분석 ─────────────────────────────────────────────
  async function handleAnalyze() {
    if (!uploadData) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          imageBase64: uploadData.base64,
          mediaType: uploadData.mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");

      const newTemplates = [...customTemplates, data as CardStyleConfig];
      saveCustomTemplates(newTemplates);
      setSelectedId((data as CardStyleConfig).id);
      setUploadOpen(false);
      setUploadPreview(null);
      setUploadData(null);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "스타일 분석 실패");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── 블로그 원고 생성 ─────────────────────────────────────────
  async function handleGenerateBlog() {
    if (!topic.trim()) { setBlogError("주제를 먼저 입력해주세요."); return; }
    setBlogError("");
    setBlogLoading(true);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ topic, cardContent: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 오류");
      setBlogResult(data);
    } catch (e) {
      setBlogError(e instanceof Error ? e.message : "블로그 원고 생성 실패");
    } finally {
      setBlogLoading(false);
    }
  }

  async function handleCopyBlog() {
    if (!blogResult) return;
    const text = `# ${blogResult.title}\n\n${blogResult.summary}\n\n${blogResult.content}\n\n태그: ${blogResult.tags.join(", ")}`;
    await navigator.clipboard.writeText(text);
    setBlogCopied(true);
    setTimeout(() => setBlogCopied(false), 2000);
  }

  function handleDownloadBlog() {
    if (!blogResult) return;
    const text = `# ${blogResult.title}\n\n요약: ${blogResult.summary}\n\n${blogResult.content}\n\n태그: ${blogResult.tags.join(", ")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteCustom(id: string) {
    const updated = customTemplates.filter((t) => t.id !== id);
    saveCustomTemplates(updated);
    if (selectedId === id) setSelectedId("A");
  }

  // ── ZIP 다운로드 ────────────────────────────────────────────
  async function handleDownload() {
    if (!content) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("tianxia-cardnews")!;
      for (let i = 0; i < 5; i++) {
        const el = captureRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 1, useCORS: true, allowTaint: true, backgroundColor: null,
          width: CARD_W, height: CARD_H,
        });
        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png", 1)
        );
        folder.file(`card_0${i + 1}.png`, blob);
      }
      folder.file("caption.txt", caption);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tianxia_cardnews_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── 카드 렌더링 ─────────────────────────────────────────────
  function renderCard(i: number, forCapture = false) {
    if (!content) return null;
    const page = `0${i + 1} / 05`;
    const cat = content.category ?? "";
    const customStyle = customTemplates.find((t) => t.id === selectedId);

    if (customStyle) {
      // 커스텀 템플릿
      const props = { page, cat, s: customStyle };
      switch (i) {
        case 0: return <DynCard1 data={content.card1} {...props} />;
        case 1: return <DynCard2 data={content.card2} {...props} />;
        case 2: return <DynCard3 data={content.card3} {...props} />;
        case 3: return <DynCard4 data={content.card4} {...props} />;
        case 4: return <DynCard5 data={content.card5} {...props} />;
      }
    }

    const props = { page, cat };
    if (selectedId === "B") {
      switch (i) {
        case 0: return <Card1B data={content.card1} {...props} />;
        case 1: return <Card2B data={content.card2} {...props} />;
        case 2: return <Card3B data={content.card3} {...props} />;
        case 3: return <Card4B data={content.card4} {...props} />;
        case 4: return <Card5B data={content.card5} {...props} />;
      }
    }
    // Template A
    switch (i) {
      case 0: return <Card1 data={content.card1} {...props} />;
      case 1: return <Card2 data={content.card2} {...props} />;
      case 2: return <Card3 data={content.card3} {...props} />;
      case 3: return <Card4 data={content.card4} {...props} />;
      case 4: return <Card5 data={content.card5} {...props} />;
    }
    return null;
  }

  const displayTopics = trendsData?.suggestions ?? DEFAULT_TOPICS;
  const fetchedTime = trendsData?.fetchedAt
    ? new Date(trendsData.fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <main className="min-h-screen bg-[#f8f8f8]">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-3 h-8 bg-[#DC2626] rounded-sm" />
        <h1 className="text-xl font-bold text-[#1A1A1A]">Tianxia 카드뉴스 생성기</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${apiKey ? "text-green-600" : "text-orange-500"}`}>
            <div className={`w-2 h-2 rounded-full ${apiKey ? "bg-green-500" : "bg-orange-400 animate-pulse"}`} />
            {apiKey ? "API 키 설정됨" : "API 키 미설정"}
          </div>
          <button
            onClick={() => { setApiKeyInput(apiKey); setShowKey(false); setSettingsOpen(true); }}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            설정
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── 주제 입력 ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-[#1A1A1A]">📌 콘텐츠 주제 입력</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="예: 대만 MZ세대 소비 트렌드 2024"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626]"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#DC2626] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Spinner /> 생성 중...
                </span>
              ) : "콘텐츠 생성"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {trendsData ? "🔥 대만 뉴스 기반 추천 주제" : "💡 추천 주제"}
              </span>
              <button
                onClick={handleFetchTrends}
                disabled={trendsLoading}
                className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 font-medium"
              >
                {trendsLoading ? <><Spinner size={12} /> 불러오는 중...</> : <>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  대만 뉴스 기반 추천
                </>}
              </button>
              {fetchedTime && <span className="text-xs text-gray-400">업데이트 {fetchedTime}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {displayTopics.map((t) => (
                <button key={t} onClick={() => setTopic(t)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${trendsData ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
                  {t}
                </button>
              ))}
            </div>
            {trendsError && <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">⚠️ {trendsError} — 기본 추천 주제를 표시합니다.</p>}
            {trendsData && trendsData.rawTrends.length > 0 && (
              <div>
                <button onClick={() => setShowRaw((v) => !v)} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                  {showRaw ? "▲ 대만 뉴스 원문 숨기기" : "▼ 대만 뉴스 원문 보기"}
                </button>
                {showRaw && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {trendsData.rawTrends.map((t, i) => (
                      <span key={i} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-1 rounded-md">{i + 1}. {t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        </section>

        {/* ── 결과 영역 ── */}
        {content && (
          <>
            {/* 템플릿 선택 */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <span className="text-sm font-bold text-[#1A1A1A] mt-2.5">🎨 템플릿</span>

                <div className="flex flex-wrap gap-2 flex-1">
                  {/* 기본 템플릿 */}
                  {BUILTIN_TEMPLATES.map((t) => (
                    <TemplateBtn
                      key={t.id}
                      name={t.name}
                      desc={t.desc}
                      active={selectedId === t.id}
                      onClick={() => setSelectedId(t.id)}
                    />
                  ))}

                  {/* 커스텀 템플릿 */}
                  {customTemplates.map((t) => (
                    <div key={t.id} className="relative group">
                      <TemplateBtn
                        name={t.name}
                        desc="레퍼런스 분석"
                        active={selectedId === t.id}
                        onClick={() => setSelectedId(t.id)}
                        accent={t.primary}
                      />
                      <button
                        onClick={() => handleDeleteCustom(t.id)}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-5 h-5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-xs transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* + 추가 버튼 */}
                  <button
                    onClick={() => { setUploadOpen(true); setUploadPreview(null); setUploadData(null); setAnalyzeError(""); }}
                    className="flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#DC2626]/40 hover:bg-red-50/30 text-gray-400 hover:text-[#DC2626] transition-all min-w-[90px]"
                  >
                    <span className="text-xl leading-none mb-0.5">+</span>
                    <span className="text-xs font-medium">레퍼런스 추가</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 카드 미리보기 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1A1A1A]">🖼️ 카드 미리보기</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">1080 × 1080 px</span>
                  <button
                    onClick={() => setEditOpen((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${editOpen ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {editOpen ? "편집 닫기" : "텍스트 편집"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-shrink-0 space-y-2">
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-100" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
                      <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
                        {renderCard(i)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center font-medium">{CARD_LABELS[i]}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 텍스트 편집 패널 */}
            {editOpen && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {EDIT_TABS.map((tab) => (
                    <button key={tab} onClick={() => setEditTab(tab)}
                      className={`flex-1 py-3 text-xs font-semibold transition-colors ${editTab === tab ? "text-[#DC2626] border-b-2 border-[#DC2626] bg-red-50/50" : "text-gray-500 hover:text-gray-700"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-6 space-y-4">
                  {editTab === "카드 1" && <>
                    <Field label="뱃지" value={content.card1.badge} onChange={(v) => updateContent("card1.badge", v)} />
                    <Field label="제목 1줄" value={content.card1.title_line1} onChange={(v) => updateContent("card1.title_line1", v)} />
                    <Field label="제목 2줄 (강조)" value={content.card1.title_line2} onChange={(v) => updateContent("card1.title_line2", v)} />
                    <Field label="서브타이틀" value={content.card1.subtitle} onChange={(v) => updateContent("card1.subtitle", v)} multiline />
                  </>}
                  {editTab === "카드 2" && <>
                    <Field label="소라벨" value={content.card2.label} onChange={(v) => updateContent("card2.label", v)} />
                    <Field label="제목" value={content.card2.title} onChange={(v) => updateContent("card2.title", v)} multiline />
                    <Field label="강조 키워드" value={content.card2.highlight} onChange={(v) => updateContent("card2.highlight", v)} />
                    <Field label="본문" value={content.card2.body} onChange={(v) => updateContent("card2.body", v)} multiline />
                  </>}
                  {editTab === "카드 3" && <>
                    <Field label="소카테고리" value={content.card3.category} onChange={(v) => updateContent("card3.category", v)} />
                    <Field label="제목" value={content.card3.title} onChange={(v) => updateContent("card3.title", v)} />
                    <Field label="본문 (강조: [[키워드]])" value={content.card3.body} onChange={(v) => updateContent("card3.body", v)} multiline />
                    <Field label="강조 키워드" value={content.card3.highlight} onChange={(v) => updateContent("card3.highlight", v)} />
                    <Field label="TIP" value={content.card3.tip} onChange={(v) => updateContent("card3.tip", v)} multiline />
                  </>}
                  {editTab === "카드 4" && <>
                    <Field label="소카테고리" value={content.card4.category} onChange={(v) => updateContent("card4.category", v)} />
                    <Field label="제목" value={content.card4.title} onChange={(v) => updateContent("card4.title", v)} />
                    {content.card4.items.map((item, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-400">항목 {i + 1}</p>
                        <Field label="태그" value={item.tag} onChange={(v) => updateContent(`card4.items.${i}.tag`, v)} />
                        <Field label="제목" value={item.title} onChange={(v) => updateContent(`card4.items.${i}.title`, v)} />
                        <Field label="설명" value={item.desc} onChange={(v) => updateContent(`card4.items.${i}.desc`, v)} />
                      </div>
                    ))}
                  </>}
                  {editTab === "카드 5" && <>
                    <Field label="메인 텍스트" value={content.card5.main} onChange={(v) => updateContent("card5.main", v)} />
                    <Field label="서브 텍스트" value={content.card5.subtitle} onChange={(v) => updateContent("card5.subtitle", v)} multiline />
                    <Field label="CTA 버튼" value={content.card5.cta} onChange={(v) => updateContent("card5.cta", v)} />
                  </>}
                  {editTab === "캡션" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-500">인스타그램 캡션</label>
                        <button onClick={handleCopy} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg">
                          {copied ? "✅ 복사됨" : "복사"}
                        </button>
                      </div>
                      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] resize-none" />
                      <p className="text-xs text-gray-400">{caption.length}자</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 캡션 (편집 닫혔을 때) */}
            {!editOpen && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A1A1A]">✏️ 인스타그램 캡션</h2>
                  <button onClick={handleCopy} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                    {copied ? "✅ 복사됨" : "복사"}
                  </button>
                </div>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] resize-none" />
                <p className="text-xs text-gray-400">{caption.length}자</p>
              </section>
            )}

            {/* 다운로드 */}
            <div className="flex justify-end">
              <button onClick={handleDownload} disabled={downloading}
                className="bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {downloading ? <><Spinner /> 이미지 생성 중...</> : <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ZIP 다운로드 (5장 + 캡션)
                </>}
              </button>
            </div>

            {/* ── 블로그 원고 섹션 ── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">📝 블로그 원고 작성</h2>
                  <p className="text-xs text-gray-400 mt-0.5">카드뉴스 내용 기반 SEO 블로그 포스트 자동 생성</p>
                </div>
                <button
                  onClick={handleGenerateBlog}
                  disabled={blogLoading}
                  className="bg-[#DC2626] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
                >
                  {blogLoading ? <><Spinner /> 작성 중...</> : "원고 생성"}
                </button>
              </div>

              {blogError && (
                <div className="px-5 py-3">
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{blogError}</p>
                </div>
              )}

              {blogResult && (
                <div className="p-5 space-y-5">
                  {/* 제목 + 요약 */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">블로그 제목</label>
                      <input
                        type="text"
                        value={blogResult.title}
                        onChange={(e) => setBlogResult({ ...blogResult, title: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">메타 요약 (SEO)</label>
                      <textarea
                        value={blogResult.summary}
                        onChange={(e) => setBlogResult({ ...blogResult, summary: e.target.value })}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none"
                      />
                    </div>
                  </div>

                  {/* 본문 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-500">본문 (마크다운)</label>
                      <span className="text-xs text-gray-400">{blogResult.content.length}자</span>
                    </div>
                    <textarea
                      value={blogResult.content}
                      onChange={(e) => setBlogResult({ ...blogResult, content: e.target.value })}
                      rows={18}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none font-mono leading-relaxed"
                    />
                  </div>

                  {/* 태그 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500">SEO 태그</label>
                    <div className="flex flex-wrap gap-2">
                      {blogResult.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                    <button
                      onClick={handleCopyBlog}
                      className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      {blogCopied ? "✅ 복사됨" : "📋 전체 복사"}
                    </button>
                    <button
                      onClick={handleDownloadBlog}
                      className="flex items-center gap-1.5 text-sm bg-[#1A1A1A] hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      .txt 다운로드
                    </button>
                  </div>
                </div>
              )}

              {!blogResult && !blogLoading && (
                <div className="px-5 py-8 text-center text-gray-400">
                  <div className="text-3xl mb-2">✍️</div>
                  <p className="text-sm">"원고 생성" 버튼을 클릭하면<br />카드뉴스 내용 기반 블로그 원고를 작성합니다</p>
                </div>
              )}
            </section>
          </>
        )}

        {!content && !loading && (
          <div className="text-center py-16 text-gray-400 space-y-4">
            <div className="text-5xl mb-2">🗂️</div>
            <p className="text-base font-medium">주제를 입력하고 콘텐츠를 생성하세요</p>
            <p className="text-sm">Claude AI가 5장 카드뉴스 + 캡션을 자동으로 제작합니다</p>
            {topic.trim() && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-3">카드뉴스 없이 블로그 원고만 바로 작성할 수도 있습니다</p>
                <button
                  onClick={handleGenerateBlog}
                  disabled={blogLoading}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-[#DC2626]/40 hover:bg-red-50/30 text-gray-700 hover:text-[#DC2626] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {blogLoading ? <><Spinner /> 작성 중...</> : "📝 블로그 원고만 작성"}
                </button>
                {blogError && <p className="text-xs text-red-600 mt-2">{blogError}</p>}
              </div>
            )}
          </div>
        )}

        {/* 카드 없이 블로그만 생성된 경우 */}
        {!content && blogResult && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#1A1A1A]">📝 블로그 원고</h2>
                <p className="text-xs text-gray-400 mt-0.5">{topic}</p>
              </div>
              <button
                onClick={handleGenerateBlog}
                disabled={blogLoading}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {blogLoading ? <Spinner size={12} /> : "재생성"}
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">블로그 제목</label>
                  <input
                    type="text"
                    value={blogResult.title}
                    onChange={(e) => setBlogResult({ ...blogResult, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">메타 요약 (SEO)</label>
                  <textarea
                    value={blogResult.summary}
                    onChange={(e) => setBlogResult({ ...blogResult, summary: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500">본문 (마크다운)</label>
                  <span className="text-xs text-gray-400">{blogResult.content.length}자</span>
                </div>
                <textarea
                  value={blogResult.content}
                  onChange={(e) => setBlogResult({ ...blogResult, content: e.target.value })}
                  rows={18}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none font-mono leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">SEO 태그</label>
                <div className="flex flex-wrap gap-2">
                  {blogResult.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={handleCopyBlog}
                  className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {blogCopied ? "✅ 복사됨" : "📋 전체 복사"}
                </button>
                <button
                  onClick={handleDownloadBlog}
                  className="flex items-center gap-1.5 text-sm bg-[#1A1A1A] hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  .txt 다운로드
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 오프스크린 캡처 대상 */}
      {content && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} ref={(el) => { captureRefs.current[i] = el; }} style={{ width: CARD_W, height: CARD_H }}>
              {renderCard(i, true)}
            </div>
          ))}
        </div>
      )}

      {/* ── API 키 설정 모달 ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && apiKey) setSettingsOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">⚙️ API 키 설정</h3>
                <p className="text-xs text-gray-400 mt-0.5">Anthropic API 키를 입력하세요</p>
              </div>
              {apiKey && (
                <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">🔑 API 키 발급 방법</p>
              <p>Anthropic Console(console.anthropic.com)에서 발급받은 키를 입력하세요.</p>
              <p className="text-blue-500">키는 브라우저 로컬스토리지에 저장되며, 요청 시 서버로 전달됩니다.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Anthropic API 키</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
                  placeholder="sk-ant-api03-..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {apiKeyInput && !apiKeyInput.startsWith("sk-ant-") && (
                <p className="text-xs text-orange-500">⚠️ Anthropic API 키는 sk-ant-로 시작합니다</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              {apiKey && (
                <button
                  onClick={() => { setApiKey(""); setApiKeyInput(""); try { localStorage.removeItem(API_KEY_STORAGE); } catch { /* ignore */ } setSettingsOpen(false); }}
                  className="text-sm text-red-400 hover:text-red-600 px-4 py-2"
                >
                  키 삭제
                </button>
              )}
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="bg-[#DC2626] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 레퍼런스 업로드 모달 ── */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setUploadOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">레퍼런스 이미지로 템플릿 만들기</h3>
              <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <p className="text-xs text-gray-500">
              핀터레스트, 인스타그램 등에서 마음에 드는 카드뉴스 이미지를 업로드하면<br />
              Claude가 색상과 스타일을 분석해 새 템플릿을 만들어 드립니다.
            </p>

            {/* 드롭존 */}
            {!uploadPreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-[#DC2626]/50 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <div className="text-4xl mb-3">🖼️</div>
                <p className="text-sm font-medium text-gray-600">이미지를 드래그하거나 클릭해서 업로드</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP 지원</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-gray-50" style={{ height: 200 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadPreview} alt="레퍼런스" className="w-full h-full object-contain" />
                  <button
                    onClick={() => { setUploadPreview(null); setUploadData(null); }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/70"
                  >×</button>
                </div>
              </div>
            )}

            {analyzeError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{analyzeError}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setUploadOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
              <button
                onClick={handleAnalyze}
                disabled={!uploadData || analyzing}
                className="bg-[#DC2626] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {analyzing ? <><Spinner /> 스타일 분석 중...</> : "✨ 템플릿 생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── 공통 컴포넌트 ────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" style={{ width: size, height: size }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function TemplateBtn({ name, desc, active, onClick, accent }: {
  name: string; desc: string; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all ${active ? "border-[#DC2626] bg-red-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
      <div className="flex items-center gap-2">
        {accent && <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accent }} />}
        <span className={`text-sm font-bold ${active ? "text-[#DC2626]" : "text-gray-700"}`}>{name}</span>
      </div>
      <span className="text-xs text-gray-400 mt-0.5">{desc}</span>
    </button>
  );
}

function Field({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />}
    </div>
  );
}
