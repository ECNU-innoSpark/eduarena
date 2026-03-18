import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Leaderboard,
  labelFor,
  scoreValue,
} from "./Leaderboard";
import {
  clampRating,
  createEmptyRatings,
  formatScore,
  normalizeQualitativeRecord,
  normalizeRatings,
  parseCsv,
  parseNumber,
  sliderValue,
} from "./qualitativeUtils";

const APP_SECTIONS = [
  { key: "qualitative", label: "Qualitative Review", note: "对话 messages 与人工评分" },
  { key: "leaderboard", label: "Leaderboard", note: "教学能力与通用基准双轴榜单" },
];

const LOCAL_RATINGS_KEY = "hi-react-cc.qualitative-ratings";

const css = `
  :root {
    color-scheme: dark;
    font-family: "Iowan Old Style", "Source Han Serif SC", "PingFang SC", serif;
    --bg: #221f1c;
    --sidebar: #262320;
    --sidebar-soft: #2c2825;
    --panel: rgba(54, 47, 42, 0.82);
    --panel-strong: rgba(63, 55, 49, 0.95);
    --text: #f1ebe3;
    --muted: #b8aea1;
    --line: rgba(255, 245, 235, 0.1);
    --accent: #d07741;
    --accent-strong: #f1c6a0;
    --cool: #3f9ba1;
    --shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-width: 320px;
    background: var(--bg);
    color: var(--text);
  }

  button, input, select { font: inherit; }

  .app {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
  }

  .sidebar {
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: linear-gradient(180deg, var(--sidebar) 0%, #24211e 100%);
    border-right: 1px solid var(--line);
    min-height: 100vh;
    position: sticky;
    top: 0;
  }

  .sidebar-head {
    padding: 20px 22px 18px;
    border-bottom: 1px solid var(--line);
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .brand-mark {
    font-size: 30px;
    line-height: 1;
  }

  .brand h2 {
    margin: 0;
    font-size: 34px;
    letter-spacing: -0.04em;
    font-weight: 600;
  }

  .brand-badge {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 7px 10px;
    font-size: 12px;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.03);
  }

  .sidebar-copy {
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
    font-size: 13px;
  }

  .sidebar-nav {
    padding: 18px 14px;
  }

  .mode-switcher {
    display: grid;
    gap: 8px;
  }

  .sidebar-group {
    margin-top: 24px;
  }

  .sidebar-label {
    margin: 0 0 12px 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .mode-tab {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 16px;
    padding: 14px 14px 14px 16px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    transition: 180ms ease;
  }

  .mode-tab:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .mode-tab.active {
    border-color: rgba(255, 255, 255, 0.08);
    background: linear-gradient(90deg, rgba(208, 119, 65, 0.16), rgba(255, 255, 255, 0.03));
  }

  .mode-tab strong {
    display: block;
    font-size: 16px;
    font-family: "SF Pro Display", "PingFang SC", sans-serif;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .mode-tab span {
    display: block;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .sidebar-foot {
    padding: 18px 22px 22px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 13px;
  }

  .content {
    min-width: 0;
    padding: 18px;
  }

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

  .workspace {
    max-width: 1380px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
    gap: 20px;
    align-items: stretch;
    margin-bottom: 22px;
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    backdrop-filter: blur(14px);
    box-shadow: var(--shadow);
    border-radius: 24px;
  }

  .hero-copy {
    padding: 28px;
    position: relative;
    overflow: hidden;
  }

  .hero-copy::after {
    content: "";
    position: absolute;
    inset: auto -48px -80px auto;
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(208, 119, 65, 0.22), transparent 68%);
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

  h1 {
    margin: 14px 0 10px;
    font-size: clamp(32px, 5vw, 64px);
    line-height: 0.94;
    letter-spacing: -0.04em;
  }

  .hero-copy p {
    margin: 0;
    max-width: 54ch;
    font-size: 16px;
    line-height: 1.65;
    color: var(--muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    padding: 20px;
  }

  .stat-card {
    padding: 18px;
    border-radius: 18px;
    background: var(--panel-strong);
    border: 1px solid var(--line);
  }

  .stat-card strong {
    display: block;
    margin-top: 6px;
    font-size: 28px;
    line-height: 1;
  }

  .stat-card span {
    color: var(--muted);
    font-size: 13px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 18px;
    padding: 14px;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tab {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    cursor: pointer;
    transition: 150ms ease;
    font-family: "SF Pro Display", "PingFang SC", sans-serif;
  }

  .tab.active {
    background: var(--accent);
    color: white;
  }

  .search {
    margin-left: auto;
    min-width: min(100%, 240px);
    flex: 1 1 240px;
  }

  .search input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    outline: none;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.9fr);
    gap: 18px;
  }

  .chart-panel,
  .detail-panel {
    padding: 18px;
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

  .bars {
    display: grid;
    gap: 12px;
  }

  .bar-row {
    display: grid;
    grid-template-columns: minmax(120px, 190px) minmax(0, 1fr) 74px;
    gap: 12px;
    align-items: center;
  }

  .bar-label {
    min-width: 0;
  }

  .bar-label strong {
    display: block;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-label span {
    color: var(--muted);
    font-size: 12px;
  }

  .bar-track {
    position: relative;
    height: 14px;
    border-radius: 999px;
    background: rgba(31, 41, 55, 0.08);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--cool), var(--accent));
  }

  .bar-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .detail-header h3 {
    margin: 0 0 6px;
    font-size: 24px;
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

  .score-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .score-card {
    padding: 14px;
    border-radius: 16px;
    background: var(--panel-strong);
    border: 1px solid var(--line);
  }

  .score-card span {
    color: var(--muted);
    font-size: 12px;
  }

  .score-card strong {
    display: block;
    margin-top: 6px;
    font-size: 22px;
  }

  .metric-list {
    display: grid;
    gap: 10px;
  }

  .metric-item {
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .metric-item header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .metric-item header span:last-child {
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
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.35fr);
    gap: 18px;
  }

  .qualitative-sidebar {
    display: grid;
    gap: 18px;
    align-self: start;
    position: sticky;
    top: 18px;
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

  .message-role {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .message-index {
    color: var(--muted);
    font-size: 12px;
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

  .empty {
    padding: 36px 18px;
    text-align: center;
    color: var(--muted);
  }

  @media (max-width: 920px) {
    .app {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
      min-height: auto;
    }

    .hero,
    .layout,
    .qualitative-layout {
      grid-template-columns: 1fr;
    }

    .search {
      margin-left: 0;
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
    .app {
      padding: 18px 14px 40px;
    }

    .bar-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .score-grid {
      grid-template-columns: 1fr;
    }

    .rating-grid {
      grid-template-columns: 1fr;
    }
  }
`;

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

function App() {
  const [models, setModels] = useState([]);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("qualitative");
  const [activeView, setActiveView] = useState("overall");
  const [selectedModel, setSelectedModel] = useState(null);
  const [messageOptions, setMessageOptions] = useState([]);
  const [selectedMessageFile, setSelectedMessageFile] = useState("");
  const [record, setRecord] = useState(null);
  const [savedScoreFile, setSavedScoreFile] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyRatings(null));
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/data/quantitive/main_experiments.csv");
      const text = await response.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ""));
      const items = rows.slice(1).map((cols) => ({
        name: cols[0]?.trim() ?? "",
        version: cols[1]?.trim() ?? "",
        note: cols[2]?.trim() ?? "",
        knowledge: parseNumber(cols[3]),
        guided: parseNumber(cols[4]),
        crossDiscipline: parseNumber(cols[5]),
        scenario: parseNumber(cols[6]),
        qualityAvg: parseNumber(cols[7]),
        mmluPro: parseNumber(cols[8]),
        math: parseNumber(cols[9]),
        ifeval: parseNumber(cols[10]),
        ceval: parseNumber(cols[11]),
        humaneval: parseNumber(cols[12]),
        lcbCode: parseNumber(cols[13]),
        aime2024: parseNumber(cols[14]),
        simpleQa: parseNumber(cols[15]),
        chineseSimpleQa: parseNumber(cols[16]),
        benchmarkAvg: parseNumber(cols[17]),
        instruction: parseNumber(cols[18]),
        worldKnowledge: parseNumber(cols[19]),
        reasoning: parseNumber(cols[20]),
      }));

      setModels(items);
      setSelectedModel(items[0] ?? null);
    }

    load();
  }, []);

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
      const response = await fetch(`/data/qualitative/messages/${selectedMessageFile}`);
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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return models.filter((model) => {
      if (!normalized) return true;
      return [model.name, model.note, model.version]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(normalized));
    });
  }, [models, query]);

  const ranked = useMemo(() => {
    return [...filtered]
      .map((model) => ({ ...model, activeScore: scoreValue(model, activeView) }))
      .filter((model) => model.activeScore != null)
      .sort((a, b) => b.activeScore - a.activeScore);
  }, [filtered, activeView]);

  useEffect(() => {
    if (!ranked.length) {
      setSelectedModel(null);
      return;
    }

    if (!selectedModel || !ranked.some((model) => model.name === selectedModel.name)) {
      setSelectedModel(ranked[0]);
    }
  }, [ranked, selectedModel]);

  const leader = ranked[0];
  const domesticCount = models.filter((item) => item.note.includes("国内")).length;
  const foreignCount = models.filter((item) => item.note.includes("国外")).length;
  const ratingSummary = useMemo(() => {
    return {
      count: ratingFolderSummary?.fileCount ?? 0,
      averageOverall: ratingFolderSummary?.averageOverall ?? null,
    };
  }, [ratingFolderSummary]);

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

  return (
    <>
      <style>{css}</style>
      <main className="app">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="brand">
              <div>
                {/*<div className="brand-mark">T</div>*/}
                <h2>EduArena</h2>
              </div>
              {/*<div className="brand-badge">Battle Mode</div>*/}
            </div>
            <p className="sidebar-copy">
              教学榜单与质性评审工作台。左侧切换 workspace，右侧查看当前内容。
            </p>
          </div>
          <nav className="sidebar-nav">
            <div className="mode-switcher">
              {APP_SECTIONS.map((section) => (
                <button
                  key={section.key}
                  className={`mode-tab ${activeSection === section.key ? "active" : ""}`}
                  onClick={() => setActiveSection(section.key)}
                  type="button"
                >
                  <strong>{section.label}</strong>
                  <span>{section.note}</span>
                </button>
              ))}
            </div>
            <div className="sidebar-group">
              <div className="sidebar-label">Current View</div>
              <button className="mode-tab" type="button">
                <strong>{activeSection === "leaderboard" ? "Model Ranking" : "Message Review"}</strong>
                <span>{activeSection === "leaderboard" ? labelFor(activeView) : "单条对话评分工作台"}</span>
              </button>
            </div>
          </nav>
          <div className="sidebar-foot">hi_react_cc · local workspace</div>
        </aside>

        <section className="content">
          <div className="content-topbar">
            <div className="topbar-title">
              {activeSection === "leaderboard" ? "Leaderboard Workspace" : "Qualitative Workspace"}
              <strong>{activeSection === "leaderboard" ? "教学能力与通用基准榜单" : "质性对话评审"}</strong>
            </div>
            <div className="topbar-meta">
              {activeSection === "leaderboard"
                ? `${models.length || 0} models loaded`
                : record
                  ? `${record.messages.length} messages`
                  : "loading"}
            </div>
          </div>

          <div className="workspace">
        {activeSection === "leaderboard" ? (
          <Leaderboard
            activeView={activeView}
            domesticCount={domesticCount}
            foreignCount={foreignCount}
            leader={leader}
            models={models}
            query={query}
            ranked={ranked}
            selectedModel={selectedModel}
            setActiveView={setActiveView}
            setQuery={setQuery}
            setSelectedModel={setSelectedModel}
          />
        ) : (
          <section className="panel qualitative">
            <div className="qualitative-hero">
              <div>
                <span className="eyebrow">qualitative review</span>
                <h2>质性对话评审</h2>
                <p>
                  将对话记录、题目背景与人工评分拆成单独工作台，便于像 Arena 一样在独立视图里查看
                  messages、完成评审并保存结果。
                </p>
              </div>
              <div className="qualitative-meta">
                <span className="pill">messages 可视化与评分保存</span>
                {record ? <span className="pill">{record.messages.length} 条消息</span> : null}
              </div>
            </div>

            {record ? (
              <div className="qualitative-layout">
                <div className="qualitative-sidebar">
                  <article className="stats-card">
                    <div className="section-title">
                      <h3>评分概览</h3>
                      <span>已保存统计</span>
                    </div>
                    <div className="stats-grid">
                      <div className="stats-item">
                        <span>当前 rating 数</span>
                        <strong>{ratingSummary.count}</strong>
                      </div>
                      <div className="stats-item">
                        <span>总体平均分</span>
                        <strong>{formatScore(ratingSummary.averageOverall, 1)}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="rating-card">
                    <div className="section-title">
                      <h3>整体评分</h3>
                      <span>0-5 分</span>
                    </div>
                    <div className="rating-grid">
	                      <label className="field">
	                        <div className="slider-head">
	                          <span>总体评价</span>
	                          <strong className="slider-value">{ratings.overview.overall === "" ? "--" : ratings.overview.overall}</strong>
	                        </div>
	                        <input
	                          max="5"
	                          min="0"
	                          step="0.5"
	                          type="range"
	                          value={sliderValue(ratings.overview.overall)}
	                          onChange={(event) => updateOverview("overall", event.target.value)}
	                        />
	                      </label>
	                      <label className="field">
	                        <div className="slider-head">
	                          <span>教学引导</span>
	                          <strong className="slider-value">{ratings.overview.pedagogy === "" ? "--" : ratings.overview.pedagogy}</strong>
	                        </div>
	                        <input
	                          max="5"
	                          min="0"
	                          step="0.5"
	                          type="range"
	                          value={sliderValue(ratings.overview.pedagogy)}
	                          onChange={(event) => updateOverview("pedagogy", event.target.value)}
	                        />
	                      </label>
	                      <label className="field">
	                        <div className="slider-head">
	                          <span>答案准确性</span>
	                          <strong className="slider-value">{ratings.overview.accuracy === "" ? "--" : ratings.overview.accuracy}</strong>
	                        </div>
	                        <input
	                          max="5"
	                          min="0"
	                          step="0.5"
	                          type="range"
	                          value={sliderValue(ratings.overview.accuracy)}
	                          onChange={(event) => updateOverview("accuracy", event.target.value)}
	                        />
	                      </label>
	                      <label className="field">
	                        <div className="slider-head">
	                          <span>互动启发性</span>
	                          <strong className="slider-value">{ratings.overview.engagement === "" ? "--" : ratings.overview.engagement}</strong>
	                        </div>
	                        <input
	                          max="5"
	                          min="0"
	                          step="0.5"
	                          type="range"
	                          value={sliderValue(ratings.overview.engagement)}
	                          onChange={(event) => updateOverview("engagement", event.target.value)}
	                        />
	                      </label>
                    </div>
                    <label className="field" style={{ marginTop: 10 }}>
                      <span>整体备注</span>
                      <textarea
                        rows="4"
                        value={ratings.overview.note}
                        onChange={(event) => updateOverview("note", event.target.value)}
                      />
                    </label>
                    <div className="save-row">
                      <button className="primary-btn" type="button" onClick={handleSaveRatings}>
                        保存评分
                      </button>
                      <span className="save-hint">
                        {saveState ||
                          "优先写入服务端 data/qualitative/message_ratings.json；若接口不存在，则回退到当前浏览器本地存储。"}
                      </span>
                    </div>
                  </article>

                  <article className="record-card">
                    <div className="section-title">
                      <h3>记录信息</h3>
                      <span>{record.record_id}</span>
                    </div>
                    {messageOptions.length ? (
                      <label className="field" style={{ marginBottom: 16 }}>
                        <span>选择消息文件</span>
                        <select
                          value={selectedMessageFile}
                          onChange={(event) => setSelectedMessageFile(event.target.value)}
                        >
                          {messageOptions.map((item) => (
                            <option key={item.fileName} value={item.fileName}>
                              {item.fileName} · {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="record-meta">
                      <div className="meta-row">
                        <span>场景</span>
                        <strong>{record.scenario}</strong>
                      </div>
                      <div className="meta-row">
                        <span>题目</span>
                        <p>{record.question}</p>
                      </div>
                      <div className="meta-row">
                        <span>意图 / 难度</span>
                        <strong>
                          {record.intent || "未提供"} / {record.difficulty || "未提供"}
                        </strong>
                      </div>
                      <div className="meta-row">
                        <span>轮次数</span>
                        <strong>{record.turn_count ?? "--"}</strong>
                      </div>
                    </div>
                  </article>
                </div>

                <article className="conversation-panel">
                  <div className="section-title">
                    <h3>Messages</h3>
                    <span>{selectedMessageFile || record.record_id} · {record.messages.length} 条消息</span>
                  </div>
                  <div className="conversation-list">
                    {record.messages.map((message, index) => {
                      return (
                        <div
                          key={`${message.role}-${index}`}
                          className={`message-card ${message.role || "unknown"}`}
                        >
                          <div className="message-head">
                            <div className="message-role">{message.role || "unknown"}</div>
                            <div className="message-index">#{index + 1}</div>
                          </div>
                          <div className="message-body">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {message.content || ""}
                            </Markdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>
            ) : (
              <div className="empty">质性记录加载中。</div>
            )}
          </section>
        )}
          </div>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
