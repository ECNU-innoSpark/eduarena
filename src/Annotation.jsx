import React, { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { TypeaheadDropdown } from "./Components";
import {
  clampRating,
  createEmptyRatings,
  formatScore,
  normalizeQualitativeRecord,
  normalizeRatings,
  sliderValue,
} from "./qualitativeUtils";

export const ANNOTATION_CSS = `
  .content-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--line);
    background: rgba(0, 0, 0, 0.08);
    border-radius: 18px;
  }

  .topbar-title {
    font-family: "SF Pro Display", "PingFang SC", sans-serif;
    font-size: 14px;
    color: var(--muted);
  }

  .topbar-title strong {
    display: block;
    margin-top: 4px;
    color: var(--text);
    font-size: 20px;
  }

  .topbar-meta {
    color: var(--muted);
    font-size: 13px;
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    backdrop-filter: blur(14px);
    box-shadow: var(--shadow);
    border-radius: 24px;
  }

  .eyebrow {
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
    background: rgba(208, 119, 65, 0.12);
    font-family: "SF Pro Display", "PingFang SC", sans-serif;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-title h2,
  .section-title h3 {
    margin: 0;
    font-size: 20px;
  }

  .section-title span {
    color: var(--muted);
    font-size: 13px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(31, 111, 120, 0.1);
    color: var(--cool);
    font-size: 12px;
  }

  .empty {
    padding: 36px 18px;
    text-align: center;
    color: var(--muted);
  }

  .qualitative {
    padding: 18px;
  }

  .qualitative-hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: end;
    margin-bottom: 18px;
  }

  .qualitative-hero h2 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .qualitative-hero p {
    margin: 0;
    max-width: 56ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .qualitative-meta {
    display: grid;
    gap: 10px;
    min-width: 240px;
  }

  .qualitative-meta .pill {
    justify-content: center;
    background: rgba(199, 104, 53, 0.1);
    color: var(--accent-strong);
  }

  .qualitative-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.8fr);
    gap: 18px;
  }

  .qualitative-sidebar {
    display: grid;
    gap: 18px;
    align-self: start;
    position: sticky;
    top: 18px;
    order: 2;
  }

  .record-card,
  .conversation-panel,
  .rating-card,
  .stats-card {
    border-radius: 20px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .record-card,
  .rating-card,
  .stats-card {
    padding: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .stats-item {
    padding: 12px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
  }

  .stats-item span {
    display: block;
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 6px;
  }

  .stats-item strong {
    display: block;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .conversation-panel {
    padding: 16px;
    min-width: 0;
    order: 1;
  }

  .record-meta {
    display: grid;
    gap: 10px;
    margin-top: 16px;
  }

  .meta-row {
    display: grid;
    gap: 4px;
  }

  .meta-row span {
    color: var(--muted);
    font-size: 12px;
  }

  .meta-row strong,
  .meta-row p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .conversation-list {
    display: grid;
    gap: 14px;
  }

  .conversation-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .conversation-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }

  .conversation-filter input {
    accent-color: var(--accent);
  }

  .message-card {
    padding: 14px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
  }

  .message-card.user {
    border-color: rgba(31, 111, 120, 0.2);
    background: rgba(63, 155, 161, 0.08);
  }

  .message-card.assistant {
    border-color: rgba(199, 104, 53, 0.2);
    background: rgba(208, 119, 65, 0.08);
  }

  .message-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
  }

  .message-head-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .message-role {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .message-tool-call-id {
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
    font-family: "SFMono-Regular", "SF Mono", "Consolas", monospace;
  }

  .message-index {
    color: var(--muted);
    font-size: 12px;
  }

  .message-toggle {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    cursor: pointer;
    font-size: 12px;
    line-height: 1.2;
  }

  .message-toggle:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.08);
  }

  .message-body {
    margin: 0;
    word-break: break-word;
    line-height: 1.7;
    font-size: 14px;
  }

  .message-body > :first-child {
    margin-top: 0;
  }

  .message-body > :last-child {
    margin-bottom: 0;
  }

  .message-body p,
  .message-body ul,
  .message-body ol,
  .message-body table,
  .message-body blockquote,
  .message-body pre,
  .message-body hr {
    margin: 0 0 12px;
  }

  .message-body h1,
  .message-body h2,
  .message-body h3,
  .message-body h4 {
    margin: 18px 0 10px;
    line-height: 1.3;
  }

  .message-body ul,
  .message-body ol {
    padding-left: 20px;
  }

  .message-body li + li {
    margin-top: 4px;
  }

  .message-body code {
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    font-family: "SFMono-Regular", "SF Mono", "Consolas", monospace;
    font-size: 0.92em;
  }

  .message-body pre {
    overflow-x: auto;
    padding: 12px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.18);
  }

  .message-body pre code {
    padding: 0;
    background: transparent;
  }

  .message-body table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid var(--line);
  }

  .message-body th,
  .message-body td {
    padding: 8px 10px;
    border: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
  }

  .message-body th {
    color: var(--accent-strong);
    background: rgba(255, 255, 255, 0.04);
  }

  .message-body hr {
    border: 0;
    border-top: 1px solid var(--line);
  }

  .message-body blockquote {
    padding-left: 14px;
    border-left: 3px solid rgba(255, 255, 255, 0.18);
    color: var(--muted);
  }

  .tool-calls {
    display: grid;
    gap: 10px;
  }

  .tool-call {
    padding: 12px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
  }

  .tool-call-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .tool-call-name {
    font-weight: 600;
  }

  .tool-call-id {
    color: var(--muted);
    font-size: 12px;
    font-family: "SFMono-Regular", "SF Mono", "Consolas", monospace;
  }

  .tool-call-label {
    display: block;
    margin-bottom: 6px;
    color: var(--muted);
    font-size: 12px;
  }

  .tool-call pre {
    margin: 0;
    overflow-x: auto;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.18);
    font-family: "SFMono-Regular", "SF Mono", "Consolas", monospace;
    font-size: 12px;
    line-height: 1.55;
  }

  .rating-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .slider-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .slider-value {
    color: var(--accent-strong);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field span {
    color: var(--muted);
    font-size: 12px;
  }

  .field input,
  .field select,
  .field textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    outline: none;
    resize: vertical;
  }

  .field input[type="range"] {
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    accent-color: var(--accent);
  }

  .save-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-top: 16px;
  }

  .primary-btn {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  .save-hint {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 920px) {
    .qualitative-layout {
      grid-template-columns: 1fr;
    }

    .qualitative-sidebar {
      position: static;
    }

    .qualitative-hero {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (max-width: 640px) {
    .rating-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const OVERVIEW_FIELDS = [
  { key: "overall", label: "总体评价" },
  { key: "pedagogy", label: "教学引导" },
  { key: "accuracy", label: "答案准确性" },
  { key: "engagement", label: "互动启发性" },
];

const LOCAL_RATINGS_KEY = "hi-react-cc.qualitative-ratings";

function readLocalRatings() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_RATINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalRatings(data) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(data));
}

const OVERVIEW_FIELD_LABELS = {
  zh: {
    overall: "总体评价",
    pedagogy: "教学引导",
    accuracy: "答案准确性",
    engagement: "互动启发性",
  },
  en: {
    overall: "Overall",
    pedagogy: "Pedagogy",
    accuracy: "Accuracy",
    engagement: "Engagement",
  },
};

const ANNOTATION_COPY = {
  zh: {
    workspace: "Qualitative Workspace",
    title: "质性对话评审",
    meta: "annotation workspace",
    eyebrow: "qualitative review",
    hero: "将对话记录、题目背景与人工评分拆成单独工作台，便于像 Arena 一样在独立视图里查看 messages、完成评审并保存结果。",
    pill: "messages 可视化与评分保存",
    messagesUnit: "条消息",
    summary: "评分概览",
    savedStats: "已保存统计",
    ratingCount: "当前 rating 数",
    avg: "总体平均分",
    overallRating: "整体评分",
    zeroToFive: "0-5 分",
    note: "整体备注",
    save: "保存评分",
    saveHint: "优先写入服务端 data/qualitative/message_ratings.json；若接口不存在，则回退到当前浏览器本地存储。",
    recordInfo: "记录信息",
    selectMessage: "选择消息文件",
    scenario: "场景",
    question: "题目",
    intentDifficulty: "意图 / 难度",
    turnCount: "轮次数",
    notProvided: "未提供",
    messages: "消息",
    collapse: "收起",
    expand: "展开",
    showTool: "显示 tool",
    loading: "质性记录加载中。",
  },
  en: {
    workspace: "Qualitative Workspace",
    title: "Qualitative Conversation Review",
    meta: "annotation workspace",
    eyebrow: "qualitative review",
    hero: "This workspace separates conversation records, task context, and human ratings so you can inspect messages, review them, and save results in a dedicated Arena-style view.",
    pill: "Message visualization and rating save",
    messagesUnit: "messages",
    summary: "Rating Summary",
    savedStats: "Saved stats",
    ratingCount: "Saved rating count",
    avg: "Average overall",
    overallRating: "Overall Rating",
    zeroToFive: "0-5 scale",
    note: "Overall note",
    save: "Save Ratings",
    saveHint: "Prefer writing to server-side data/qualitative/message_ratings.json; if the API is unavailable, fall back to browser local storage.",
    recordInfo: "Record Info",
    selectMessage: "Message file",
    scenario: "Scenario",
    question: "Question",
    intentDifficulty: "Intent / Difficulty",
    turnCount: "Turn count",
    notProvided: "Not provided",
    messages: "Messages",
    collapse: "Collapse",
    expand: "Expand",
    showTool: "Show tool",
    loading: "Loading qualitative record.",
  },
};

export function Annotation({ locale = "zh" }) {
  const copy = ANNOTATION_COPY[locale] ?? ANNOTATION_COPY.zh;
  const [messageOptions, setMessageOptions] = useState([]);
  const [selectedMessageFile, setSelectedMessageFile] = useState("");
  const [record, setRecord] = useState(null);
  const [savedScoreFile, setSavedScoreFile] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyRatings(null));
  const [saveState, setSaveState] = useState("");
  const [collapsedMessages, setCollapsedMessages] = useState({});
  const [showToolMessages, setShowToolMessages] = useState(true);

  useEffect(() => {
    async function loadRatings() {
      let scoreFile = readLocalRatings() ?? { version: 1, records: {} };
      let scoreSource = scoreFile.records && Object.keys(scoreFile.records).length ? "local" : "empty";

      try {
        const scoreResponse = await fetch("/api/qualitative-ratings");
        if (scoreResponse.ok) {
          scoreFile = await scoreResponse.json();
          writeLocalRatings(scoreFile);
          scoreSource = "server";
        } else {
          const fallbackResponse = await fetch("/data/qualitative/message_ratings.json");
          if (fallbackResponse.ok) {
            scoreFile = await fallbackResponse.json();
            writeLocalRatings(scoreFile);
            scoreSource = "file";
          }
        }
      } catch {
        const fallbackResponse = await fetch("/data/qualitative/message_ratings.json");
        if (fallbackResponse.ok) {
          scoreFile = await fallbackResponse.json();
          writeLocalRatings(scoreFile);
          scoreSource = "file";
        }
      }

      setSavedScoreFile(scoreFile);
      if (scoreSource === "local") {
        setSaveState("未检测到保存接口，已加载浏览器中的本地评分缓存。");
      }
    }

    loadRatings().catch(() => {
      setSaveState("评分文件加载失败，请检查数据文件路径。");
    });
  }, []);

  useEffect(() => {
    async function loadMessageOptions() {
      const response = await fetch("/api/qualitative-messages");
      if (!response.ok) {
        throw new Error(`message options failed:${response.status}`);
      }

      const items = await response.json();
      setMessageOptions(items);
      if (items[0]?.fileName) {
        setSelectedMessageFile(items[0].fileName);
      }
    }

    loadMessageOptions().catch(async () => {
      setMessageOptions([]);
      setSelectedMessageFile("");
      try {
        const response = await fetch("/data/qualitative/records.json");
        const fallbackRecord = normalizeQualitativeRecord(await response.json(), "records.json");
        setRecord(fallbackRecord);
      } catch {
        setSaveState("质性记录加载失败，请检查数据文件路径。");
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedMessageFile) return;

    async function loadSelectedRecord() {
      const response = await fetch(`/api/qualitative-messages?file=${encodeURIComponent(selectedMessageFile)}`);
      if (!response.ok) {
        throw new Error(`record failed:${response.status}`);
      }

      const nextRecord = normalizeQualitativeRecord(await response.json(), selectedMessageFile);
      setRecord(nextRecord);
    }

    loadSelectedRecord().catch(() => {
      setSaveState(`消息文件加载失败：${selectedMessageFile}`);
    });
  }, [selectedMessageFile]);

  useEffect(() => {
    setRatings(normalizeRatings(record, savedScoreFile));
  }, [record, savedScoreFile]);

  useEffect(() => {
    setCollapsedMessages({});
  }, [record?.record_id, selectedMessageFile]);

  useEffect(() => {
    async function loadRatingFolderSummary() {
      const response = await fetch("/api/qualitative-ratings-folder");
      if (!response.ok) {
        throw new Error(`folder summary failed:${response.status}`);
      }
      const summary = await response.json();
      setRatingFolderSummary(summary);
    }

    loadRatingFolderSummary().catch(() => {
      setRatingFolderSummary(null);
    });
  }, []);

  const ratingSummary = useMemo(() => {
    return {
      count: ratingFolderSummary?.fileCount ?? 0,
      averageOverall: ratingFolderSummary?.averageOverall ?? null,
    };
  }, [ratingFolderSummary]);

  const visibleMessages = useMemo(() => {
    const messages = record?.messages ?? [];
    return showToolMessages ? messages : messages.filter((message) => message.role !== "tool");
  }, [record?.messages, showToolMessages]);

  function updateOverview(field, value) {
    setRatings((current) => ({
      ...current,
      overview: {
        ...current.overview,
        [field]: field === "note" ? value : clampRating(value),
      },
    }));
  }

  async function handleSaveRatings() {
    if (!record) return;

    const nextFile = {
      version: 1,
      savedAt: new Date().toISOString(),
      records: {
        ...(savedScoreFile?.records ?? {}),
        [record.record_id]: {
          record_id: record.record_id,
          scenario: record.scenario,
          question: record.question,
          turn_count: record.turn_count,
          updatedAt: new Date().toISOString(),
          overview: ratings.overview,
        },
      },
    };

    try {
      const response = await fetch("/api/qualitative-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextFile),
      });

      if (!response.ok) {
        throw new Error(`save failed:${response.status}`);
      }

      const savedFile = await response.json();
      writeLocalRatings(savedFile);
      setSavedScoreFile(savedFile);
      try {
        const folderResponse = await fetch("/api/qualitative-ratings-folder");
        if (folderResponse.ok) {
          const folderSummary = await folderResponse.json();
          setRatingFolderSummary(folderSummary);
        }
      } catch {}
      setSaveState("评分已保存到服务器端 JSON 文件。");
    } catch (error) {
      writeLocalRatings(nextFile);
      setSavedScoreFile(nextFile);

      const message = String(error?.message ?? "");
      if (message.includes("404")) {
        setSaveState("保存接口不存在，评分已改为保存到当前浏览器本地。若需写回 JSON，请使用 npm run dev。");
        return;
      }
      setSaveState("服务器保存失败，评分已暂存到当前浏览器本地。");
    }
  }

  function toggleMessage(index) {
    setCollapsedMessages((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function formatToolArguments(rawArguments) {
    if (!rawArguments) return "";

    try {
      return JSON.stringify(JSON.parse(rawArguments), null, 2);
    } catch {
      return rawArguments;
    }
  }

  function renderMessageContent(message) {
    if (typeof message.content === "string" && message.content.trim()) {
      return (
        <Markdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </Markdown>
      );
    }

    if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
      return (
        <div className="tool-calls">
          {message.tool_calls.map((toolCall, toolIndex) => {
            const functionName = toolCall?.function?.name || toolCall?.type || "tool_call";
            const formattedArguments = formatToolArguments(toolCall?.function?.arguments);

            return (
              <div key={toolCall?.id || `${functionName}-${toolIndex}`} className="tool-call">
                <div className="tool-call-head">
                  <span className="tool-call-name">{functionName}</span>
                  {toolCall?.id ? <span className="tool-call-id">{toolCall.id}</span> : null}
                </div>
                {formattedArguments ? (
                  <>
                    <span className="tool-call-label">arguments</span>
                    <pre>{formattedArguments}</pre>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  }

  return (
    <>
      <div className="content-topbar">
        <div className="topbar-title">
          {copy.workspace}
          <strong>{copy.title}</strong>
        </div>
        <div className="topbar-meta">{copy.meta}</div>
      </div>

      <section className="panel qualitative">
        <div className="qualitative-hero">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2>{copy.title}</h2>
            <p>{copy.hero}</p>
          </div>
          <div className="qualitative-meta">
            <span className="pill">{copy.pill}</span>
            {record ? <span className="pill">{record.messages.length} {copy.messagesUnit}</span> : null}
          </div>
        </div>

        {record ? (
          <div className="qualitative-layout">
            <div className="qualitative-sidebar">
              <article className="stats-card">
                <div className="section-title">
                  <h3>{copy.summary}</h3>
                  <span>{copy.savedStats}</span>
                </div>
                <div className="stats-grid">
                  <div className="stats-item">
                    <span>{copy.ratingCount}</span>
                    <strong>{ratingSummary.count}</strong>
                  </div>
                  <div className="stats-item">
                    <span>{copy.avg}</span>
                    <strong>{formatScore(ratingSummary.averageOverall, 1)}</strong>
                  </div>
                </div>
              </article>

              <article className="rating-card">
                <div className="section-title">
                  <h3>{copy.overallRating}</h3>
                  <span>{copy.zeroToFive}</span>
                </div>
                <div className="rating-grid">
                  {OVERVIEW_FIELDS.map((field) => (
                    <label key={field.key} className="field">
                      <div className="slider-head">
                        <span>{OVERVIEW_FIELD_LABELS[locale]?.[field.key] ?? field.label}</span>
                        <strong className="slider-value">
                          {ratings.overview[field.key] === "" ? "--" : ratings.overview[field.key]}
                        </strong>
                      </div>
                      <input
                        max="5"
                        min="0"
                        step="0.5"
                        type="range"
                        value={sliderValue(ratings.overview[field.key])}
                        onChange={(event) => updateOverview(field.key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <label className="field" style={{ marginTop: 10 }}>
                  <span>{copy.note}</span>
                  <textarea
                    rows="4"
                    value={ratings.overview.note}
                    onChange={(event) => updateOverview("note", event.target.value)}
                  />
                </label>
                <div className="save-row">
                  <button className="primary-btn" type="button" onClick={handleSaveRatings}>
                    {copy.save}
                  </button>
                  <span className="save-hint">
                    {saveState || copy.saveHint}
                  </span>
                </div>
              </article>

              <article className="record-card">
                <div className="section-title">
                  <h3>{copy.recordInfo}</h3>
                  <span>{record.record_id}</span>
                </div>
                {messageOptions.length ? (
                  <TypeaheadDropdown
                    label={copy.selectMessage}
                    onChange={setSelectedMessageFile}
                    options={messageOptions}
                    style={{ marginBottom: 16 }}
                    value={selectedMessageFile}
                  />
                ) : null}
                <div className="record-meta">
                  <div className="meta-row">
                    <span>{copy.scenario}</span>
                    <strong>{record.scenario}</strong>
                  </div>
                  <div className="meta-row">
                    <span>{copy.question}</span>
                    <p>{record.question}</p>
                  </div>
                  <div className="meta-row">
                    <span>{copy.intentDifficulty}</span>
                    <strong>
                      {record.intent || copy.notProvided} / {record.difficulty || copy.notProvided}
                    </strong>
                  </div>
                  <div className="meta-row">
                    <span>{copy.turnCount}</span>
                    <strong>{record.turn_count ?? "--"}</strong>
                  </div>
                </div>
              </article>
            </div>

            <article className="conversation-panel">
              <div className="section-title">
                <h3>{copy.messages}</h3>
                <span>{selectedMessageFile || record.record_id} · {visibleMessages.length} {copy.messagesUnit}</span>
              </div>
              <div className="conversation-toolbar">
                <label className="conversation-filter">
                  <input
                    checked={showToolMessages}
                    onChange={(event) => setShowToolMessages(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{copy.showTool}</span>
                </label>
              </div>
              <div className="conversation-list">
                {visibleMessages.map((message, index) => {
                  const isCollapsed = Boolean(collapsedMessages[index]);

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={`message-card ${message.role || "unknown"}`}
                    >
                      <div className="message-head">
                        <div className="message-role">
                          <span>{message.role || "unknown"}</span>
                          {message.role === "tool" && message.tool_call_id ? (
                            <span className="message-tool-call-id">{message.tool_call_id}</span>
                          ) : null}
                        </div>
                        <div className="message-head-actions">
                          <button
                            className="message-toggle"
                            onClick={() => toggleMessage(index)}
                            type="button"
                          >
                            {isCollapsed ? copy.expand : copy.collapse}
                          </button>
                          <div className="message-index">#{index + 1}</div>
                        </div>
                      </div>
                      {!isCollapsed ? (
                        <div className="message-body">
                          {renderMessageContent(message)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        ) : (
          <div className="empty">{copy.loading}</div>
        )}
      </section>
    </>
  );
}
