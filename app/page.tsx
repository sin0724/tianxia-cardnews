"use client";

import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import {
  Card1, Card2, Card3, Card4, Card5,
  type CardNewsContent,
} from "@/components/CardTemplates";
import { Card1B, Card2B, Card3B, Card4B, Card5B } from "@/components/CardTemplatesB";
import { Card1C, Card2C, Card3C, Card4C, Card5C } from "@/components/CardTemplatesC";
import { Card1D, Card2D, Card3D, Card4D, Card5D } from "@/components/CardTemplatesD";
import {
  DynCard1, DynCard2, DynCard3, DynCard4, DynCard5,
  type CardStyleConfig,
} from "@/components/DynamicCards";
import { FlexCard, type StoryboardTemplate } from "@/components/FlexCard";
import type { ScheduleEntry } from "@/lib/scheduler";
import { PPCard1, PPCard2, PPCard3, PPCard4, PPCard5 } from "@/components/PowerPageCards";

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
  { id: "A", name: "레드 클래식", desc: "풀 컬러 배경", primary: "#DC2626", secondary: "#1A1A1A" },
  { id: "B", name: "에디토리얼", desc: "화이트 기반 편집체", primary: "#1A1A1A", secondary: "#E8E8E8" },
  { id: "C", name: "다이나믹 타이포", desc: "다크·하단집중·스텝형", primary: "#0D0D0D", secondary: "#DC2626" },
  { id: "D", name: "클린 레이아웃", desc: "상단집중·스플릿·번호형", primary: "#FFFFFF", secondary: "#DC2626" },
] as const;

const STORAGE_KEY = "tianxia_custom_templates";
const STORYBOARD_STORAGE_KEY = "tianxia_storyboard_templates";
const API_KEY_STORAGE = "tianxia_api_key";
const POWER_PAGE_STORAGE_KEY = "tianxia_power_pages";

interface TrendsResult {
  suggestions: string[];
  rawTrends: string[];
  fetchedAt: string;
}

interface PowerPageInfo {
  storeName: string;
  address: string;
  menus: string;
  keywords: string;
  slogan: string;
}

interface PowerPagePreset extends PowerPageInfo {
  id: string;
}

interface UploadSlot {
  preview: string;
  base64: string;
  mediaType: string;
}

export default function HomePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [powerPage, setPowerPage] = useState(false);
  const [powerPageInfo, setPowerPageInfo] = useState<PowerPageInfo>({
    storeName: "", address: "", menus: "", keywords: "", slogan: "",
  });
  const [savedPowerPages, setSavedPowerPages] = useState<PowerPagePreset[]>([]);
  const [powerPageImages, setPowerPageImages] = useState<(UploadSlot | null)[]>(Array(5).fill(null));

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState<CardNewsContent | null>(null);
  const [caption, setCaption] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedId, setSelectedId] = useState<string>("A");
  const [customTemplates, setCustomTemplates] = useState<CardStyleConfig[]>([]);
  const [storyboardTemplates, setStoryboardTemplates] = useState<StoryboardTemplate[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("카드 1");

  // Step 2 인라인 레퍼런스 업로드
  const [uploadSlots, setUploadSlots] = useState<(UploadSlot | null)[]>(Array(5).fill(null));
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeSuccess, setAnalyzeSuccess] = useState("");
  const [lastCreatedTemplate, setLastCreatedTemplate] = useState<CardStyleConfig | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // 스토리보드 업로드
  const [storyboardSlot, setStoryboardSlot] = useState<UploadSlot | null>(null);
  const [analyzingStoryboard, setAnalyzingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState("");
  const [storyboardSuccess, setStoryboardSuccess] = useState("");

  // Step 3 모달 레퍼런스 업로드
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSlots3, setUploadSlots3] = useState<(UploadSlot | null)[]>(Array(5).fill(null));
  const [analyzing3, setAnalyzing3] = useState(false);
  const [analyzeError3, setAnalyzeError3] = useState("");
  const [analyzeSuccess3, setAnalyzeSuccess3] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  // 자동화 패널
  const [autoOpen, setAutoOpen] = useState(false);
  const [instantPosting, setInstantPosting] = useState(false);
  const [postingStep, setPostingStep] = useState("");
  const [instantResult, setInstantResult] = useState<{
    topic?: string; blogTitle?: string; postUrl?: string; queued?: boolean; log?: string[]; error?: string;
  } | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedType, setSchedType] = useState<"daily" | "weekly" | "once">("weekly");
  const [schedDate, setSchedDate] = useState("");
  const [schedWeekdays, setSchedWeekdays] = useState<number[]>([1, 3, 5]); // 월/수/금
  const [schedLoading, setSchedLoading] = useState(false);

  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsResult | null>(null);
  const [trendsError, setTrendsError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState("");
  const [blogResult, setBlogResult] = useState<{ title: string; summary: string; content: string; tags: string[] } | null>(null);
  const [blogCopied, setBlogCopied] = useState(false);

  const captureRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCustomTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
    try {
      const savedSB = localStorage.getItem(STORYBOARD_STORAGE_KEY);
      if (savedSB) setStoryboardTemplates(JSON.parse(savedSB));
    } catch { /* ignore */ }
    try {
      const savedPP = localStorage.getItem(POWER_PAGE_STORAGE_KEY);
      if (savedPP) setSavedPowerPages(JSON.parse(savedPP));
    } catch { /* ignore */ }
    const savedKey = localStorage.getItem(API_KEY_STORAGE) ?? "";
    setApiKey(savedKey);
    setApiKeyInput(savedKey);
    if (!savedKey) setSettingsOpen(true);
    loadSchedules();
  }, []);

  async function loadSchedules() {
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      setSchedules(data);
    } catch { /* ignore */ }
  }

  /** 현재 생성된 카드뉴스로 포스팅 */
  async function handlePostCurrent() {
    if (!content) return;
    setInstantPosting(true);
    setInstantResult(null);
    try {
      // 1. 카드 이미지 캡처
      setPostingStep("카드 이미지 캡처 중...");
      const images: string[] = [];
      for (let i = 0; i < 5; i++) {
        const el = captureRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 1, useCORS: true, allowTaint: true, backgroundColor: null,
          width: CARD_W, height: CARD_H,
        });
        images.push(canvas.toDataURL("image/png", 0.9));
      }

      // 2. 블로그 원고 생성 (이미 생성돼 있으면 재사용)
      let blog = blogResult;
      if (!blog) {
        setPostingStep("블로그 원고 생성 중...");
        const res = await fetch("/api/blog/generate", {
          method: "POST",
          headers: { ...apiHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ topic, cardContent: content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "블로그 생성 실패");
        setBlogResult(data);
        blog = data;
      }

      // 3. 네이버 포스팅
      setPostingStep("네이버 블로그 포스팅 중... (1~2분 소요)");
      const postRes = await fetch("/api/naver/post-now", {
        method: "POST",
        headers: { ...apiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blog!.title,
          content: blog!.content,
          tags: blog!.tags,
          images,
        }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error ?? "포스팅 실패");

      if (postData.queued) {
        setInstantResult({ blogTitle: blog!.title, queued: true });
      } else {
        setInstantResult({ blogTitle: blog!.title, postUrl: postData.postUrl });
      }
    } catch (e) {
      setInstantResult({ error: e instanceof Error ? e.message : "알 수 없는 오류" });
    } finally {
      setInstantPosting(false);
      setPostingStep("");
    }
  }

  /** 새 주제로 처음부터 자동 생성 후 포스팅 */
  async function handleInstantPost() {
    setInstantPosting(true);
    setInstantResult(null);
    try {
      // 1. 트렌드 → 카드뉴스 → 블로그 원고 생성
      setPostingStep("트렌드 수집 및 콘텐츠 생성 중...");
      const autoRes = await fetch("/api/auto-run", {
        method: "POST",
        headers: apiHeaders(),
      });
      const autoData = await autoRes.json();
      if (!autoRes.ok || !autoData.success) throw new Error(autoData.error ?? "콘텐츠 생성 실패");

      // 2. 생성된 카드뉴스를 UI에 반영하고 캡처
      setContent(autoData.cardContent);
      setCaption(autoData.cardContent?.caption ?? "");
      setTopic(autoData.topic ?? "");
      await new Promise((r) => setTimeout(r, 800)); // 렌더링 대기

      setPostingStep("카드 이미지 캡처 중...");
      const images: string[] = [];
      for (let i = 0; i < 5; i++) {
        const el = captureRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 1, useCORS: true, allowTaint: true, backgroundColor: null,
          width: CARD_W, height: CARD_H,
        });
        images.push(canvas.toDataURL("image/png", 0.9));
      }

      // 3. 네이버 포스팅
      setPostingStep("네이버 블로그 포스팅 중... (1~2분 소요)");
      const postRes = await fetch("/api/naver/post-now", {
        method: "POST",
        headers: { ...apiHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoData.blogTitle,
          content: autoData.blogContent,
          tags: autoData.tags ?? [],
          images,
        }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error ?? "포스팅 실패");

      if (postData.queued) {
        setInstantResult({ topic: autoData.topic, blogTitle: autoData.blogTitle, queued: true });
      } else {
        setInstantResult({ topic: autoData.topic, blogTitle: autoData.blogTitle, postUrl: postData.postUrl });
      }
    } catch (e) {
      setInstantResult({ error: e instanceof Error ? e.message : "알 수 없는 오류" });
    } finally {
      setInstantPosting(false);
      setPostingStep("");
    }
  }

  async function handleAddSchedule() {
    if (!schedTime) return;
    if (schedType === "weekly" && schedWeekdays.length === 0) return;
    setSchedLoading(true);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: schedTime,
          type: schedType,
          date: schedDate || undefined,
          weekdays: schedType === "weekly" ? schedWeekdays : undefined,
        }),
      });
      await loadSchedules();
      setSchedDate("");
    } catch { /* ignore */ }
    setSchedLoading(false);
  }

  async function handleToggleSchedule(id: string) {
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    await loadSchedules();
  }

  async function handleDeleteSchedule(id: string) {
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await loadSchedules();
  }

  function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim();
    setApiKey(trimmed);
    try { localStorage.setItem(API_KEY_STORAGE, trimmed); } catch { /* ignore */ }
    setSettingsOpen(false);
  }

  function savePowerPagePreset() {
    if (!powerPageInfo.storeName.trim()) return;
    const preset: PowerPagePreset = { ...powerPageInfo, id: `pp_${Date.now()}` };
    const updated = [...savedPowerPages, preset];
    setSavedPowerPages(updated);
    try { localStorage.setItem(POWER_PAGE_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function deletePowerPagePreset(id: string) {
    const updated = savedPowerPages.filter((p) => p.id !== id);
    setSavedPowerPages(updated);
    try { localStorage.setItem(POWER_PAGE_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function loadPowerPagePreset(preset: PowerPagePreset) {
    setPowerPageInfo({
      storeName: preset.storeName,
      address: preset.address, menus: preset.menus,
      keywords: preset.keywords, slogan: preset.slogan,
    });
  }

  function apiHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-user-api-key": apiKey } : {}),
    };
  }

  function saveCustomTemplates(templates: CardStyleConfig[]) {
    setCustomTemplates(templates);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch { /* ignore */ }
  }

  function saveStoryboardTemplates(templates: StoryboardTemplate[]) {
    setStoryboardTemplates(templates);
    try { localStorage.setItem(STORYBOARD_STORAGE_KEY, JSON.stringify(templates)); } catch { /* ignore */ }
  }

  function handleDeleteStoryboard(id: string) {
    const updated = storyboardTemplates.filter((t) => t.id !== id);
    saveStoryboardTemplates(updated);
    if (selectedId === id) setSelectedId("A");
  }

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

  async function handleGenerate() {
    setError("");
    setLoading(true);
    setContent(null);
    setCaption("");
    setEditOpen(false);
    try {
      const filledImages = powerPageImages.filter(Boolean) as UploadSlot[];
      const res = await fetch("/api/cardnews/generate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          topic,
          powerPage,
          powerPageInfo,
          powerPageImages: filledImages.length > 0
            ? filledImages.map((s) => ({ base64: s.base64, mediaType: s.mediaType }))
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 오류");
      setContent(data);
      setCaption(data.caption ?? "");
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

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

  function readFileAsSlot(file: File): Promise<UploadSlot> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const [header, base64] = result.split(",");
        const mediaType = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
        resolve({ preview: result, base64, mediaType });
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSlotFile(file: File, index: number) {
    if (!file.type.startsWith("image/")) return;
    const slot = await readFileAsSlot(file);
    setUploadSlots((prev) => prev.map((s, i) => i === index ? slot : s));
    setAnalyzeError("");
    setAnalyzeSuccess("");
  }

  async function handlePowerPageImageFile(file: File, index: number) {
    if (!file.type.startsWith("image/")) return;
    const slot = await readFileAsSlot(file);
    setPowerPageImages((prev) => prev.map((s, i) => i === index ? slot : s));
  }

  async function handleSlotFile3(file: File, index: number) {
    if (!file.type.startsWith("image/")) return;
    const slot = await readFileAsSlot(file);
    setUploadSlots3((prev) => prev.map((s, i) => i === index ? slot : s));
    setAnalyzeError3("");
  }

  async function handleAnalyze() {
    const filled = uploadSlots.filter(Boolean) as UploadSlot[];
    if (filled.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ images: filled.map((s) => ({ base64: s.base64, mediaType: s.mediaType })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      const newConfig = data as CardStyleConfig;
      const existingIdx = customTemplates.findIndex((t) => t.name === newConfig.name);
      let finalId: string;
      let finalTemplates: CardStyleConfig[];
      if (existingIdx >= 0) {
        finalId = customTemplates[existingIdx].id;
        finalTemplates = customTemplates.map((t, i) => i === existingIdx ? { ...newConfig, id: finalId } : t);
      } else {
        finalId = newConfig.id;
        finalTemplates = [...customTemplates, newConfig];
      }
      saveCustomTemplates(finalTemplates);
      setSelectedId(finalId);
      setLastCreatedTemplate(newConfig);
      setUploadSlots(Array(5).fill(null));
      setAnalyzeSuccess(newConfig.name);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "스타일 분석 실패");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAnalyzeStoryboard() {
    if (!storyboardSlot) return;
    setAnalyzingStoryboard(true);
    setStoryboardError("");
    setStoryboardSuccess("");
    try {
      const res = await fetch("/api/analyze-storyboard", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ image: { base64: storyboardSlot.base64, mediaType: storyboardSlot.mediaType } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      const tpl = data as StoryboardTemplate;
      const updated = [...storyboardTemplates, tpl];
      saveStoryboardTemplates(updated);
      setSelectedId(tpl.id);
      setStoryboardSlot(null);
      setStoryboardSuccess(tpl.name);
    } catch (e) {
      setStoryboardError(e instanceof Error ? e.message : "스토리보드 분석 실패");
    } finally {
      setAnalyzingStoryboard(false);
    }
  }

  async function handleAnalyze3() {
    const filled = uploadSlots3.filter(Boolean) as UploadSlot[];
    if (filled.length === 0) return;
    setAnalyzing3(true);
    setAnalyzeError3("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ images: filled.map((s) => ({ base64: s.base64, mediaType: s.mediaType })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      const newConfig = data as CardStyleConfig;
      const existingIdx3 = customTemplates.findIndex((t) => t.name === newConfig.name);
      let finalId3: string;
      let finalTemplates3: CardStyleConfig[];
      if (existingIdx3 >= 0) {
        finalId3 = customTemplates[existingIdx3].id;
        finalTemplates3 = customTemplates.map((t, i) => i === existingIdx3 ? { ...newConfig, id: finalId3 } : t);
      } else {
        finalId3 = newConfig.id;
        finalTemplates3 = [...customTemplates, newConfig];
      }
      saveCustomTemplates(finalTemplates3);
      setSelectedId(finalId3);
      setUploadSlots3(Array(5).fill(null));
      setAnalyzeSuccess3(newConfig.name);
      setTimeout(() => {
        setUploadOpen(false);
        setAnalyzeSuccess3("");
      }, 2000);
    } catch (e) {
      setAnalyzeError3(e instanceof Error ? e.message : "스타일 분석 실패");
    } finally {
      setAnalyzing3(false);
    }
  }

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

  function handleRenameTemplate(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = customTemplates.map((t) => t.id === id ? { ...t, name: trimmed } : t);
    saveCustomTemplates(updated);
    setEditingTemplateId(null);
  }

  function startEditTemplateName(id: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTemplateId(id);
    setEditingName(currentName);
  }

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

  function handleReset() {
    setContent(null);
    setCaption("");
    setStep(1);
    setTopic("");
    setPowerPage(false);
    setPowerPageInfo({ storeName: "", address: "", menus: "", keywords: "", slogan: "" });
    setPowerPageImages(Array(5).fill(null));
    setBlogResult(null);
    setError("");
    setEditOpen(false);
  }

  function renderCard(i: number) {
    if (!content) return null;
    const page = `0${i + 1} / 05`;
    const cat = content.category ?? "";

    // 파워페이지: 광고주 사진을 배경으로 텍스트 오버레이
    if (powerPage) {
      const image = powerPageImages[i]?.preview ?? undefined;
      const pp = { page, cat, image };
      switch (i) {
        case 0: return <PPCard1 data={content.card1} {...pp} />;
        case 1: return <PPCard2 data={content.card2} {...pp} />;
        case 2: return <PPCard3 data={content.card3} {...pp} />;
        case 3: return <PPCard4 data={content.card4} {...pp} />;
        case 4: return <PPCard5 data={content.card5} {...pp} />;
      }
    }

    const storyboardTpl = storyboardTemplates.find((t) => t.id === selectedId);
    if (storyboardTpl) {
      return <FlexCard layout={storyboardTpl.cards[i]} data={content} cardIndex={i} page={page} cat={cat} />;
    }

    const customStyle = customTemplates.find((t) => t.id === selectedId);
    if (customStyle) {
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
    if (selectedId === "C") {
      switch (i) {
        case 0: return <Card1C data={content.card1} {...props} />;
        case 1: return <Card2C data={content.card2} {...props} />;
        case 2: return <Card3C data={content.card3} {...props} />;
        case 3: return <Card4C data={content.card4} {...props} />;
        case 4: return <Card5C data={content.card5} {...props} />;
      }
    }
    if (selectedId === "D") {
      switch (i) {
        case 0: return <Card1D data={content.card1} {...props} />;
        case 1: return <Card2D data={content.card2} {...props} />;
        case 2: return <Card3D data={content.card3} {...props} />;
        case 3: return <Card4D data={content.card4} {...props} />;
        case 4: return <Card5D data={content.card5} {...props} />;
      }
    }
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
            onClick={() => { setAutoOpen(true); loadSchedules(); }}
            className="flex items-center gap-1.5 text-xs bg-[#DC2626] hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            자동 포스팅
          </button>
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

      {/* ── STEP 1 & 2 ── */}
      {(step === 1 || (step === 2 && !loading)) && (
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <StepsBar step={step} />

          {/* STEP 1: 주제 입력 */}
          {step === 1 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">어떤 주제로 만들까요?</h2>
                <p className="text-sm text-gray-400 mt-1">주제를 직접 입력하거나 아래 추천 주제를 선택하세요</p>
              </div>

              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && topic.trim() && (setPowerPage(false), setStep(2))}
                placeholder="예: 대만 MZ세대 소비 트렌드 2024"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626]"
                autoFocus
              />

              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
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

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { setPowerPage(false); setStep(2); }}
                  disabled={!topic.trim()}
                  className="bg-[#DC2626] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  다음 단계
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 구분선 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">또는</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* 파워페이지 버튼 */}
              <button
                onClick={() => { setTopic(""); setPowerPage(true); setStep(2); }}
                className="w-full border-2 border-dashed border-gray-200 hover:border-[#DC2626]/50 hover:bg-red-50/40 rounded-xl py-4 text-center transition-all group"
              >
                <div className="text-2xl mb-1">📸</div>
                <p className="text-sm font-bold text-gray-700 group-hover:text-[#DC2626] transition-colors">파워페이지 카드뉴스 제작</p>
                <p className="text-xs text-gray-400 mt-0.5">광고주 이미지로 주제 없이 바로 템플릿 선택</p>
              </button>
            </section>
          )}

          {/* STEP 2: 템플릿 + 레퍼런스 */}
          {step === 2 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-7">
              {/* 주제 표시 */}
              {topic ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">선택한 주제</span>
                  <span className="bg-[#DC2626]/10 text-[#DC2626] font-semibold text-sm px-3 py-1 rounded-full">{topic}</span>
                  <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-[#DC2626] underline underline-offset-2 transition-colors">수정</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-orange-50 text-orange-500 font-semibold px-2.5 py-1 rounded-full">📸 파워페이지 모드 — 번체 중문 생성</span>
                      <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-[#DC2626] underline underline-offset-2 transition-colors">← 처음으로</button>
                    </div>

                    {/* 저장된 업체 프리셋 */}
                    {savedPowerPages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500">저장된 업체</p>
                        <div className="flex flex-wrap gap-2">
                          {savedPowerPages.map((p) => (
                            <div key={p.id} className="flex items-center gap-1 group">
                              <button
                                onClick={() => loadPowerPagePreset(p)}
                                className="text-xs bg-gray-100 hover:bg-[#DC2626] hover:text-white text-gray-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                              >
                                {p.storeName}
                              </button>
                              <button
                                onClick={() => deletePowerPagePreset(p.id)}
                                className="hidden group-hover:flex w-4 h-4 bg-gray-300 hover:bg-red-500 text-white rounded-full items-center justify-center text-xs transition-colors -ml-0.5"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 업체 정보 폼 */}
                    <div className="space-y-3 border border-orange-100 rounded-xl p-4 bg-orange-50/30">
                      <PPField label="상호명 *" placeholder="예: 토라슌" value={powerPageInfo.storeName} onChange={(v) => setPowerPageInfo({ ...powerPageInfo, storeName: v })} />
                      <PPField label="주소 *" placeholder="예: 마포구 와우산로29마길 10-4" value={powerPageInfo.address} onChange={(v) => setPowerPageInfo({ ...powerPageInfo, address: v })} />
                      <PPField label="대표 메뉴 *" placeholder="예: 삼겹살, 소금구이, 불백 (쉼표 구분)" value={powerPageInfo.menus} onChange={(v) => setPowerPageInfo({ ...powerPageInfo, menus: v })} />
                      <PPField label="키워드 / 해시태그" placeholder="예: 맛집, 홍대, 고기집, 한국식당" value={powerPageInfo.keywords} onChange={(v) => setPowerPageInfo({ ...powerPageInfo, keywords: v })} />
                      <PPField label="슬로건 (선택)" placeholder="예: 홍대에서 꼭 먹어야 할 고기 맛집!" value={powerPageInfo.slogan} onChange={(v) => setPowerPageInfo({ ...powerPageInfo, slogan: v })} />
                      <button
                        onClick={savePowerPagePreset}
                        disabled={!powerPageInfo.storeName.trim()}
                        className="text-xs bg-white border border-gray-200 hover:border-[#DC2626] hover:text-[#DC2626] text-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + 이 업체 저장
                      </button>
                    </div>

                    {/* 광고주 사진 업로드 — 카드 배경으로 사용됨 */}
                    <div className="space-y-3 border-2 border-orange-200 rounded-xl p-4 bg-orange-50/40">
                      <div>
                        <p className="text-sm font-bold text-gray-700">📷 업체 사진 업로드
                          <span className="text-orange-500 font-normal text-xs ml-2">카드 배경으로 사용됩니다</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          카드 1~5 순서대로 한 장씩 업로드하세요. 사진이 카드 배경이 되고 번체 중문 텍스트가 위에 올라갑니다.
                        </p>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        {["커버", "메뉴", "분위기", "리스트", "방문안내"].map((label, i) => (
                          <span key={i} className="text-[10px] text-gray-400 font-medium">{label}</span>
                        ))}
                      </div>
                      <MultiUploadGrid
                        slots={powerPageImages}
                        onFileSelected={handlePowerPageImageFile}
                        onRemove={(i) => setPowerPageImages((prev) => prev.map((s, idx) => idx === i ? null : s))}
                      />
                      {powerPageImages.some(Boolean) && (
                        <p className="text-xs text-orange-600 bg-orange-100 rounded-lg px-3 py-2">
                          ✅ {powerPageImages.filter(Boolean).length}장 업로드됨 — 사진이 카드 배경으로 적용됩니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 템플릿 선택 (파워페이지는 사진이 배경이므로 숨김) */}
              {!powerPage && <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1A1A]">🎨 템플릿 선택</h3>
                  <span className="text-xs text-gray-400">카드 스타일을 선택하세요</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      desc={t.desc}
                      primary={t.primary}
                      secondary={t.secondary}
                      active={selectedId === t.id}
                      onClick={() => setSelectedId(t.id)}
                    />
                  ))}
                  {storyboardTemplates.map((t) => (
                    <div key={t.id} className="relative">
                      <TemplateCard
                        name={t.name}
                        desc="스토리보드 분석"
                        primary={t.cards[0].background}
                        secondary={t.cards[2].background}
                        active={selectedId === t.id}
                        onClick={() => setSelectedId(t.id)}
                        badge="📋"
                      />
                      <button
                        onClick={() => handleDeleteStoryboard(t.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors opacity-70 hover:opacity-100"
                      >×</button>
                    </div>
                  ))}
                  {customTemplates.map((t) => (
                    <div key={t.id} className="relative">
                      {editingTemplateId === t.id ? (
                        <div className={`rounded-xl border-2 overflow-hidden ${selectedId === t.id ? "border-[#DC2626]" : "border-gray-200"}`}>
                          <div className="h-14 flex">
                            <div className="flex-1" style={{ background: t.primary }} />
                            <div className="flex-1" style={{ background: t.darkCardBg }} />
                            <div className="flex-1 bg-white border-l border-black/5" />
                          </div>
                          <div className="p-3 bg-white space-y-2">
                            <input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameTemplate(t.id, editingName);
                                if (e.key === "Escape") setEditingTemplateId(null);
                              }}
                              className="w-full text-sm font-bold border border-[#DC2626]/50 rounded-lg px-2 py-1 focus:outline-none focus:border-[#DC2626]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-1.5">
                              <button onClick={() => handleRenameTemplate(t.id, editingName)} className="text-xs bg-[#DC2626] text-white px-2.5 py-1 rounded-lg font-semibold">저장</button>
                              <button onClick={() => setEditingTemplateId(null)} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">취소</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <TemplateCard
                          name={t.name}
                          desc="레퍼런스 분석"
                          primary={t.primary}
                          secondary={t.darkCardBg}
                          active={selectedId === t.id}
                          onClick={() => setSelectedId(t.id)}
                          onEditName={(e) => startEditTemplateName(t.id, t.name, e)}
                        />
                      )}
                      <button
                        onClick={() => handleDeleteCustom(t.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors opacity-70 hover:opacity-100"
                      >×</button>
                    </div>
                  ))}
                </div>
                {analyzeSuccess && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 space-y-2">
                    <p className="text-xs text-green-700 font-semibold">✅ &apos;{analyzeSuccess}&apos; 템플릿이 추가됐어요!</p>
                    {lastCreatedTemplate && (
                      <div className="flex items-center gap-2">
                        <div className="flex rounded overflow-hidden border border-green-200 h-6 flex-shrink-0">
                          <div className="w-7" style={{ background: lastCreatedTemplate.coverBg }} />
                          <div className="w-7" style={{ background: lastCreatedTemplate.darkCardBg }} />
                          <div className="w-7" style={{ background: lastCreatedTemplate.lightCardBg }} />
                          <div className="w-7" style={{ background: lastCreatedTemplate.primary }} />
                        </div>
                        <span className="text-xs text-green-600">커버 · 다크 · 라이트 · 포인트 색상</span>
                      </div>
                    )}
                  </div>
                )}
              </div>}

              {/* 스토리보드 업로드 — 파워페이지 모드에서는 숨김 */}
              {!powerPage && <div className="space-y-3 border-t border-gray-100 pt-6">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">
                    📋 스토리보드로 템플릿 만들기
                    <span className="text-gray-400 font-normal text-xs ml-1">(선택) — 한 장짜리 스토리보드</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">여러 화면이 담긴 스토리보드 이미지 1장을 올리면 디자인 시스템을 분석해 템플릿을 만들어 드립니다</p>
                </div>

                <StoryboardUpload
                  slot={storyboardSlot}
                  onFileSelected={async (file) => {
                    const slot = await readFileAsSlot(file);
                    setStoryboardSlot(slot);
                    setStoryboardError("");
                    setStoryboardSuccess("");
                  }}
                  onRemove={() => { setStoryboardSlot(null); setStoryboardError(""); setStoryboardSuccess(""); }}
                />

                {storyboardError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{storyboardError}</p>}

                {storyboardSuccess && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-green-700 font-semibold">✅ &apos;{storyboardSuccess}&apos; 템플릿이 추가됐어요! 카드뉴스를 생성하면 스토리보드 레이아웃이 적용됩니다.</p>
                  </div>
                )}

                {storyboardSlot && !storyboardSuccess && (
                  <button
                    onClick={handleAnalyzeStoryboard}
                    disabled={analyzingStoryboard}
                    className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {analyzingStoryboard ? <><Spinner /> 스토리보드 분석 중...</> : "✨ 스토리보드로 템플릿 만들기"}
                  </button>
                )}
              </div>}

              {/* 레퍼런스 이미지 업로드 (인라인) — 파워페이지 모드에서는 숨김 */}
              {!powerPage && <div className="space-y-3 border-t border-gray-100 pt-6">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">
                    🖼️ 레퍼런스 이미지
                    <span className="text-gray-400 font-normal text-xs ml-1">(선택) — 카드 5장 한 세트</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">카드뉴스 이미지를 최대 5장 올리면 색상·스타일을 분석해 새 템플릿을 만들어 드립니다</p>
                </div>

                <MultiUploadGrid
                  slots={uploadSlots}
                  onFileSelected={handleSlotFile}
                  onRemove={(i) => setUploadSlots((prev) => prev.map((s, idx) => idx === i ? null : s))}
                />

                {analyzeError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{analyzeError}</p>}

                {uploadSlots.some(Boolean) && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {analyzing ? <><Spinner /> 스타일 분석 중...</> : `✨ ${uploadSlots.filter(Boolean).length}장으로 템플릿 만들기`}
                  </button>
                )}
              </div>}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

              {/* 액션 버튼 */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  이전
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || (powerPage && (!powerPageInfo.storeName.trim() || !powerPageInfo.address.trim() || !powerPageInfo.menus.trim()))}
                  className="bg-[#DC2626] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {powerPage ? "파워페이지 생성 (中文)" : "카드뉴스 생성"}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <Spinner size={48} />
          <p className="mt-6 text-base font-semibold text-[#1A1A1A]">카드뉴스를 생성하고 있습니다...</p>
          <p className="text-sm text-gray-400 mt-2">Claude AI가 5장 카드뉴스를 작성하고 있어요</p>
          <div className="mt-4 text-xs text-gray-500 bg-gray-100 rounded-lg px-4 py-2 inline-block">
            주제: <strong>{topic}</strong>
          </div>
        </div>
      )}

      {/* ── STEP 3: 결과 ── */}
      {step === 3 && content && !loading && (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {/* 상단 바 */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              새로 만들기
            </button>
            <span className="text-xs text-gray-300">|</span>
            {topic ? (
              <>
                <span className="text-xs text-gray-400">주제</span>
                <span className="text-sm font-semibold text-[#1A1A1A]">{topic}</span>
              </>
            ) : (
              <span className="text-xs bg-orange-50 text-orange-500 font-semibold px-2.5 py-1 rounded-full">📸 파워페이지</span>
            )}
          </div>

          {/* 템플릿 (compact) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <span className="text-sm font-bold text-[#1A1A1A] mt-2.5">🎨 템플릿</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {BUILTIN_TEMPLATES.map((t) => (
                  <TemplateBtn key={t.id} name={t.name} desc={t.desc} active={selectedId === t.id} onClick={() => setSelectedId(t.id)} primary={t.primary} secondary={t.secondary} />
                ))}
                {storyboardTemplates.map((t) => (
                  <div key={t.id} className="relative">
                    <TemplateBtn name={t.name} desc="스토리보드 분석" active={selectedId === t.id} onClick={() => setSelectedId(t.id)} primary={t.cards[0].background} secondary={t.cards[2].background} badge="📋" />
                    <button
                      onClick={() => handleDeleteStoryboard(t.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors opacity-60 hover:opacity-100"
                    >×</button>
                  </div>
                ))}
                {customTemplates.map((t) => (
                  <div key={t.id} className="relative">
                    <TemplateBtn name={t.name} desc="레퍼런스 분석" active={selectedId === t.id} onClick={() => setSelectedId(t.id)} primary={t.primary} secondary={t.darkCardBg} />
                    <button
                      onClick={() => handleDeleteCustom(t.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-300 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors opacity-60 hover:opacity-100"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => { setUploadOpen(true); setUploadSlots3(Array(5).fill(null)); setAnalyzeError3(""); setAnalyzeSuccess3(""); }}
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
                <span className="text-xs text-gray-400">1080 × 1350 px</span>
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

          {/* 캡션 */}
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

          {/* 블로그 원고 */}
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
            {blogError && <div className="px-5 py-3"><p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{blogError}</p></div>}
            {blogResult ? (
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">블로그 제목</label>
                    <input type="text" value={blogResult.title}
                      onChange={(e) => setBlogResult({ ...blogResult, title: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">메타 요약 (SEO)</label>
                    <textarea value={blogResult.summary}
                      onChange={(e) => setBlogResult({ ...blogResult, summary: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500">본문</label>
                    <span className="text-xs text-gray-400">{blogResult.content.length}자</span>
                  </div>
                  <textarea value={blogResult.content}
                    onChange={(e) => setBlogResult({ ...blogResult, content: e.target.value })}
                    rows={18}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] resize-none leading-relaxed" />
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
                  <button onClick={handleCopyBlog} className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                    {blogCopied ? "✅ 복사됨" : "📋 전체 복사"}
                  </button>
                  <button onClick={handleDownloadBlog} className="flex items-center gap-1.5 text-sm bg-[#1A1A1A] hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    .txt 다운로드
                  </button>
                </div>
              </div>
            ) : !blogLoading && (
              <div className="px-5 py-8 text-center text-gray-400">
                <div className="text-3xl mb-2">✍️</div>
                <p className="text-sm">"원고 생성" 버튼을 클릭하면<br />카드뉴스 내용 기반 블로그 원고를 작성합니다</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 오프스크린 캡처 */}
      {content && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} ref={(el) => { captureRefs.current[i] = el; }} style={{ width: CARD_W, height: CARD_H }}>
              {renderCard(i)}
            </div>
          ))}
        </div>
      )}

      {/* ⚡ 자동 포스팅 모달 */}
      {autoOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAutoOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">⚡ 자동 포스팅</h3>
                <p className="text-xs text-gray-400 mt-0.5">대만 뉴스 → 카드뉴스 → 네이버 블로그 자동화</p>
              </div>
              <button onClick={() => setAutoOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* ── 현재 카드뉴스로 포스팅 ── */}
              {content && (
                <section className="space-y-3">
                  <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#DC2626] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    현재 카드뉴스로 포스팅
                  </h4>
                  <p className="text-xs text-gray-400">생성된 카드뉴스 5장을 이미지로 캡처해 블로그 원고와 함께 네이버에 포스팅합니다.</p>
                  <button
                    onClick={handlePostCurrent}
                    disabled={instantPosting}
                    className="w-full bg-[#DC2626] text-white py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {instantPosting ? (
                      <><Spinner /> {postingStep || "포스팅 진행 중..."}</>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        현재 카드뉴스로 포스팅
                      </>
                    )}
                  </button>
                </section>
              )}

              {/* ── 새로 생성 후 포스팅 ── */}
              <section className="space-y-3">
                <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-xs font-bold">{content ? "2" : "1"}</span>
                  새로 생성 후 포스팅
                </h4>
                <p className="text-xs text-gray-400">대만 뉴스 트렌드에서 주제를 골라 카드뉴스 + 블로그를 새로 만들고 포스팅합니다.</p>

                <button
                  onClick={handleInstantPost}
                  disabled={instantPosting}
                  className="w-full bg-[#1A1A1A] text-white py-3 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {instantPosting ? (
                    <><Spinner /> {postingStep || "진행 중..."}</>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      새로 생성 후 포스팅
                    </>
                  )}
                </button>
              </section>

              {/* 결과 */}
              {instantResult && (
                <div className={`rounded-xl p-4 space-y-2 ${
                  instantResult.error
                    ? "bg-red-50 border border-red-100"
                    : instantResult.queued
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-green-50 border border-green-100"
                }`}>
                  {instantResult.error ? (
                    <p className="text-xs text-red-700 font-semibold">❌ {instantResult.error}</p>
                  ) : instantResult.queued ? (
                    <>
                      <p className="text-xs font-bold text-blue-700">⏳ 대기열에 저장됐습니다</p>
                      <div className="space-y-1">
                        {instantResult.topic && <p className="text-xs text-gray-700"><span className="font-semibold">주제:</span> {instantResult.topic}</p>}
                        <p className="text-xs text-gray-700"><span className="font-semibold">제목:</span> {instantResult.blogTitle}</p>
                        <p className="text-xs text-blue-600">로컬 PC의 자동 포스터가 곧 네이버에 포스팅합니다. (약 1분 이내)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-green-700">✅ 포스팅 완료!</p>
                      <div className="space-y-1">
                        {instantResult.topic && <p className="text-xs text-gray-700"><span className="font-semibold">주제:</span> {instantResult.topic}</p>}
                        <p className="text-xs text-gray-700"><span className="font-semibold">제목:</span> {instantResult.blogTitle}</p>
                        {instantResult.postUrl && (
                          <a href={instantResult.postUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline break-all">{instantResult.postUrl}</a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="h-px bg-gray-100" />

              {/* ── 예약 포스팅 ── */}
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  예약 포스팅
                </h4>

                {/* 예약 추가 폼 */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-600">새 예약 추가</p>

                  {/* 반복 타입 */}
                  <div className="flex gap-1.5">
                    {(["weekly", "daily", "once"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSchedType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          schedType === t
                            ? "bg-[#DC2626] text-white"
                            : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {t === "weekly" ? "요일 반복" : t === "daily" ? "매일" : "한 번만"}
                      </button>
                    ))}
                  </div>

                  {/* 요일 선택 */}
                  {schedType === "weekly" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">요일 선택</label>
                      <div className="flex gap-1">
                        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => {
                          const active = schedWeekdays.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() =>
                                setSchedWeekdays((prev) =>
                                  active ? prev.filter((v) => v !== i) : [...prev, i].sort()
                                )
                              }
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? "bg-[#DC2626] text-white"
                                  : "bg-white border border-gray-200 text-gray-400 hover:border-gray-400"
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 날짜 선택 (한 번만) */}
                  {schedType === "once" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">날짜</label>
                      <input
                        type="date"
                        value={schedDate}
                        onChange={(e) => setSchedDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] bg-white"
                      />
                    </div>
                  )}

                  {/* 시간 */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">시간 (KST)</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] bg-white"
                    />
                  </div>

                  <button
                    onClick={handleAddSchedule}
                    disabled={
                      schedLoading ||
                      (schedType === "once" && !schedDate) ||
                      (schedType === "weekly" && schedWeekdays.length === 0)
                    }
                    className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {schedLoading ? <><Spinner /> 저장 중...</> : "+ 예약 추가"}
                  </button>
                </div>

                {/* 예약 목록 */}
                {schedules.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">등록된 예약 ({schedules.length}개)</p>
                    {schedules.map((s) => (
                      <div key={s.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${s.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSchedule(s.id)}
                            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${s.enabled ? "bg-[#DC2626]" : "bg-gray-300"}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{s.time} KST</p>
                            <p className="text-xs text-gray-400">
                              {s.type === "weekly"
                                ? `매주 ${(s.weekdays ?? []).map((d) => ["일","월","화","수","목","금","토"][d]).join("/")} `
                                : s.type === "daily"
                                ? "매일 "
                                : `${s.date} 한 번 `}
                              {s.time} KST
                              {s.lastRanAt && ` · 마지막: ${new Date(s.lastRanAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-lg leading-none"
                        >×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-2xl mb-1">🕐</p>
                    <p className="text-xs">등록된 예약이 없습니다</p>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  로컬 PC의 자동 포스터(1분마다 실행)가 스케줄을 확인합니다. 스케줄 실행 시 대만 뉴스 기반 콘텐츠를 자동 생성 후 네이버에 포스팅합니다.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* API 키 설정 모달 */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && apiKey) setSettingsOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">⚙️ API 키 설정</h3>
                <p className="text-xs text-gray-400 mt-0.5">Anthropic API 키를 입력하세요</p>
              </div>
              {apiKey && <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>}
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
                <button type="button" onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                >키 삭제</button>
              )}
              <button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}
                className="bg-[#DC2626] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 레퍼런스 추가 모달 */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !analyzeSuccess3) setUploadOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">레퍼런스 이미지로 템플릿 만들기</h3>
              {!analyzeSuccess3 && <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>}
            </div>
            <p className="text-xs text-gray-500">카드뉴스 이미지를 최대 5장(한 세트) 업로드하면 Claude가 색상과 스타일을 분석해 새 템플릿을 만들어 드립니다.</p>

            <MultiUploadGrid
              slots={uploadSlots3}
              onFileSelected={handleSlotFile3}
              onRemove={(i) => setUploadSlots3((prev) => prev.map((s, idx) => idx === i ? null : s))}
            />

            {analyzeError3 && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{analyzeError3}</p>}
            {analyzeSuccess3 ? (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center space-y-1">
                <p className="text-sm text-green-700 font-bold">✅ 템플릿 생성 완료!</p>
                <p className="text-xs text-green-600">&apos;{analyzeSuccess3}&apos; 템플릿이 선택됐습니다. 잠시 후 창이 닫힙니다.</p>
              </div>
            ) : (
              <div className="flex gap-3 justify-end">
                <button onClick={() => setUploadOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">취소</button>
                <button onClick={handleAnalyze3} disabled={!uploadSlots3.some(Boolean) || analyzing3}
                  className="bg-[#DC2626] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  {analyzing3 ? <><Spinner /> 스타일 분석 중...</> : `✨ ${uploadSlots3.filter(Boolean).length || ""}장으로 템플릿 생성`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ── 공통 컴포넌트 ────────────────────────────────────────────

const STEP_LABELS = ["주제 입력", "템플릿 선택", "생성 완료"];

function StepsBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center">
      {STEP_LABELS.map((label, i) => {
        const s = i + 1;
        const done = s < step;
        const current = s === step;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done ? "bg-green-500 text-white" :
                current ? "bg-[#DC2626] text-white shadow-lg shadow-red-200" :
                "bg-gray-100 text-gray-400"
              }`}>
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${current ? "text-[#DC2626]" : done ? "text-green-600" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 w-16 mx-3 mb-5 transition-all ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TemplateCard({ name, desc, primary, secondary, active, onClick, onEditName, badge }: {
  name: string; desc: string; primary: string; secondary: string; active: boolean; onClick: () => void; onEditName?: (e: React.MouseEvent) => void; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className={`w-full rounded-xl overflow-hidden border-2 transition-all text-left ${active ? "border-[#DC2626] shadow-md shadow-red-100" : "border-gray-100 hover:border-gray-300"}`}>
      <div className="h-14 flex">
        <div className="flex-1" style={{ background: primary }} />
        <div className="flex-1" style={{ background: secondary }} />
        <div className="flex-1 bg-white border-l border-black/5" />
      </div>
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {badge && <span className="text-xs">{badge}</span>}
              <p className={`text-sm font-bold truncate ${active ? "text-[#DC2626]" : "text-gray-700"}`}>{name}</p>
              {onEditName && (
                <button
                  onClick={onEditName}
                  className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                  title="이름 수정"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
          {active && (
            <div className="w-5 h-5 bg-[#DC2626] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" style={{ width: size, height: size }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function TemplateBtn({ name, desc, active, onClick, primary, secondary, badge }: {
  name: string; desc: string; active: boolean; onClick: () => void; primary?: string; secondary?: string; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-start rounded-xl border text-left transition-all overflow-hidden min-w-[90px] ${active ? "border-[#DC2626] shadow-md shadow-red-100" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
      {(primary || secondary) && (
        <div className="w-full h-7 flex">
          <div className="flex-1" style={{ background: primary ?? "#ccc" }} />
          <div className="flex-1" style={{ background: secondary ?? "#eee" }} />
          <div className="flex-1 bg-white border-l border-black/5" />
        </div>
      )}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1">
          {badge && <span className="text-xs">{badge}</span>}
          <span className={`text-sm font-bold ${active ? "text-[#DC2626]" : "text-gray-700"}`}>{name}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function PPField({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-400"
      />
    </div>
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

function StoryboardUpload({ slot, onFileSelected, onRemove }: {
  slot: UploadSlot | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) onFileSelected(f);
  }

  return (
    <div className="space-y-2">
      {slot ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.preview} alt="스토리보드" className="w-full max-h-48 object-contain" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-gray-800/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors"
          >×</button>
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">스토리보드 업로드됨</div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            dragOver ? "border-[#DC2626] bg-red-50/60" : "border-gray-200 hover:border-[#DC2626]/50 hover:bg-red-50/30"
          }`}
        >
          <span className={`text-3xl leading-none ${dragOver ? "text-[#DC2626]" : "text-gray-300"}`}>📋</span>
          <span className="text-xs text-gray-400">스토리보드 이미지를 드래그하거나 클릭하세요</span>
          <span className="text-[10px] text-gray-300">JPG, PNG, WebP · 1장</span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MultiUploadGrid({ slots, onFileSelected, onRemove }: {
  slots: (UploadSlot | null)[];
  onFileSelected: (file: File, index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openPicker(i: number) {
    setActiveIdx(i);
    setPickerOpen(true);
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.click();
    }
  }

  function handleDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOverIdx(null);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) onFileSelected(f, i);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="relative aspect-square"
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={(e) => handleDrop(e, i)}
          >
            {slot ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.preview}
                  alt={`카드 ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => onRemove(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                >×</button>
              </>
            ) : (
              <button
                onClick={() => openPicker(i)}
                className={`w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
                  dragOverIdx === i
                    ? "border-[#DC2626] bg-red-50/60"
                    : pickerOpen && activeIdx === i
                    ? "border-[#DC2626]/70 bg-red-50/40"
                    : "border-gray-200 hover:border-[#DC2626]/50 hover:bg-red-50/30"
                }`}
              >
                <span className={`text-xl leading-none ${dragOverIdx === i ? "text-[#DC2626]" : "text-gray-300"}`}>
                  {dragOverIdx === i ? "↓" : "+"}
                </span>
                <span className="text-gray-400 text-[10px]">카드 {i + 1}</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">{slots.filter(Boolean).length}/5장 업로드됨 · JPG, PNG, WebP · 드래그도 가능</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setPickerOpen(false);
          const f = e.target.files?.[0];
          if (f) onFileSelected(f, activeIdx);
        }}
        onBlur={() => setPickerOpen(false)}
      />
    </div>
  );
}
