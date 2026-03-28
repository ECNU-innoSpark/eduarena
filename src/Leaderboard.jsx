import React, { useEffect, useMemo, useState } from "react";
import { appUrl } from "./appUrl";
import { formatScore, parseCsv, parseNumber } from "./qualitativeUtils";

export const LEADERBOARD_CSS = `
  .leaderboard-header {
    display: grid;
    gap: 22px;
    margin-bottom: 28px;
  }

  .leaderboard-title {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: 0;
    color: var(--muted);
  }

  .leaderboard-title-icon {
    color: var(--muted);
    font-size: 12px;
    line-height: 1;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
    gap: 20px;
    align-items: stretch;
    margin-bottom: 22px;
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
    display: grid;
    gap: 16px;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    align-items: center;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: 150ms ease;
    font-family: "SF Pro Display", "PingFang SC", sans-serif;
    font-size: 12px;
    line-height: 1.1;
  }

  .tab.active {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
  }

  .tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    color: currentColor;
    font-size: 12px;
    line-height: 1;
    opacity: 0.9;
  }

  .tab-label {
    white-space: nowrap;
  }

  .search {
    min-width: 0;
  }

  .benchmark-filter input {
    border-style: dashed;
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
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
  }

  .chart-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .chart-mode-tabs {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
  }

  .chart-mode-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
  }

  .chart-mode-tab.active {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
  }

  .chart-mode-icon {
    font-size: 12px;
    line-height: 1;
  }

  .bars {
    display: grid;
    gap: 10px;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 28px minmax(180px, 260px) minmax(0, 1fr) 96px;
    gap: 12px;
    align-items: center;
    padding: 4px 0;
  }

  .bar-rank {
    color: rgba(255, 255, 255, 0.35);
    font-size: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .bar-label {
    min-width: 0;
  }

  .bar-label strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-label span {
    color: var(--muted);
    font-size: 11px;
  }

  .bar-track {
    position: relative;
    height: 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #efe9b6 0%, #9fd8b5 45%, #2da487 100%);
  }

  .bar-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }

  .rank-table {
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.015);
  }

  .rank-table-head,
  .rank-row {
    display: grid;
    grid-template-columns: 76px minmax(260px, 1.8fr) 120px 120px 128px;
    gap: 16px;
    align-items: center;
  }

  .rank-table-head {
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--muted);
    font-size: 12px;
  }

  .rank-table-head span:nth-child(1),
  .rank-table-head span:nth-child(n + 3) {
    text-align: center;
  }

  .rank-row {
    width: 100%;
    padding: 18px;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .rank-row:first-of-type {
    border-top: 0;
  }

  .rank-row:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .rank-row.active {
    background: rgba(255, 255, 255, 0.04);
  }

  .rank-cell-rank,
  .rank-cell-score,
  .rank-cell-quality,
  .rank-cell-benchmark {
    font-variant-numeric: tabular-nums;
  }

  .rank-cell-rank {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
  }

  .rank-cell-model {
    min-width: 0;
  }

  .rank-primary {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rank-secondary {
    margin-top: 6px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.2;
  }

  .rank-cell-score,
  .rank-cell-quality,
  .rank-cell-benchmark {
    text-align: center;
    font-size: 14px;
  }

  .detail-header {
    display: grid;
    gap: 12px;
    margin-bottom: 18px;
  }

  .detail-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .detail-brand {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .detail-header h3 {
    margin: 0;
    font-size: 28px;
    line-height: 1.02;
  }

  .detail-subline {
    color: var(--muted);
    font-size: 13px;
  }

  .detail-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    font-size: 12px;
  }

  .score-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .spec-card {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.02);
  }

  .spec-card span {
    color: var(--muted);
    font-size: 12px;
  }

  .spec-card strong {
    display: block;
    margin-top: 6px;
    font-size: 20px;
  }

  .benchmark-card {
    padding: 14px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
  }

  .benchmark-table {
    display: grid;
    gap: 10px;
  }

  .benchmark-table-head,
  .benchmark-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 92px 72px;
    gap: 12px;
    align-items: center;
  }

  .benchmark-table-head {
    padding: 0 10px 8px;
    color: var(--muted);
    font-size: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .benchmark-row {
    padding: 10px;
    border-radius: 14px;
  }

  .benchmark-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .benchmark-name {
    font-size: 13px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .benchmark-score,
  .benchmark-rank {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .benchmark-score {
    font-size: 13px;
  }

  .benchmark-rank {
    color: var(--muted);
    font-size: 12px;
  }

  @media (max-width: 920px) {
    .hero,
    .layout {
      grid-template-columns: 1fr;
    }

    .tabs {
      gap: 10px;
    }

    .score-grid,
    .spec-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .rank-table-head,
    .rank-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .score-grid {
      grid-template-columns: 1fr;
    }

    .spec-grid {
      grid-template-columns: 1fr;
    }

    .rank-cell-rank,
    .rank-cell-score,
    .rank-cell-quality,
    .rank-cell-benchmark {
      text-align: left;
    }

    .benchmark-table-head,
    .benchmark-row {
      grid-template-columns: 1fr;
    }

    .benchmark-score,
    .benchmark-rank {
      text-align: left;
    }
  }
`;

// Python equivalent:
// QUALITY_METRICS = [
//     {"key": "knowledge", "label": "知识点讲解", "max": 5},
//     {"key": "guided", "label": "引导式讲题", "max": 5},
//     {"key": "crossDiscipline", "label": "跨学科教案", "max": 5},
//     {"key": "scenario", "label": "情景化出题", "max": 5},
//     {"key": "qualityAvg", "label": "教学平均分", "max": 5},
// ]
export const QUALITY_METRICS = [
  { key: "knowledge", label: { zh: "知识点讲解", en: "Knowledge Teaching" }, max: 5 },
  { key: "guided", label: { zh: "引导式讲题", en: "Guided Instruction" }, max: 5 },
  { key: "crossDiscipline", label: { zh: "跨学科教案", en: "Cross-disciplinary Design" }, max: 5 },
  { key: "scenario", label: { zh: "情景化出题", en: "Scenario-based Tasks" }, max: 5 },
  { key: "qualityAvg", label: { zh: "教学平均分", en: "Teaching Avg" }, max: 5 },
];

// Python equivalent:
// BENCHMARK_METRICS = [
//     {"key": "mmluPro", "label": "MMLU-Pro", "max": 100},
//     {"key": "math", "label": "Math", "max": 100},
//     {"key": "ifeval", "label": "IFEval", "max": 100},
//     {"key": "ceval", "label": "CEval", "max": 100},
//     {"key": "humaneval", "label": "HumanEval", "max": 100},
//     {"key": "lcbCode", "label": "LCB Code", "max": 100},
//     {"key": "aime2024", "label": "AIME 2024", "max": 100},
//     {"key": "simpleQa", "label": "SimpleQA", "max": 100},
//     {"key": "chineseSimpleQa", "label": "Chinese SimpleQA", "max": 100},
//     {"key": "benchmarkAvg", "label": "综合基准分", "max": 100},
//     {"key": "instruction", "label": "指令遵循", "max": 100},
//     {"key": "worldKnowledge", "label": "世界知识", "max": 100},
//     {"key": "reasoning", "label": "复杂推理", "max": 100},
// ]
export const BENCHMARK_METRICS = [
  { key: "mmluPro", label: { zh: "MMLU-Pro", en: "MMLU-Pro" }, max: 100 },
  { key: "math", label: { zh: "Math", en: "Math" }, max: 100 },
  { key: "ifeval", label: { zh: "IFEval", en: "IFEval" }, max: 100 },
  { key: "ceval", label: { zh: "CEval", en: "CEval" }, max: 100 },
  { key: "humaneval", label: { zh: "HumanEval", en: "HumanEval" }, max: 100 },
  { key: "lcbCode", label: { zh: "LCB Code", en: "LCB Code" }, max: 100 },
  { key: "aime2024", label: { zh: "AIME 2024", en: "AIME 2024" }, max: 100 },
  { key: "simpleQa", label: { zh: "SimpleQA", en: "SimpleQA" }, max: 100 },
  { key: "chineseSimpleQa", label: { zh: "Chinese SimpleQA", en: "Chinese SimpleQA" }, max: 100 },
  { key: "benchmarkAvg", label: { zh: "综合基准分", en: "Benchmark Avg" }, max: 100 },
  { key: "instruction", label: { zh: "指令遵循", en: "Instruction Following" }, max: 100 },
  { key: "worldKnowledge", label: { zh: "世界知识", en: "World Knowledge" }, max: 100 },
  { key: "reasoning", label: { zh: "复杂推理", en: "Reasoning" }, max: 100 },
  { key: "aiIndexScore", label: { zh: "AI Index Score", en: "AI Index Score" }, max: 100 },
  { key: "aiIndexRank", label: { zh: "AI Index Rank", en: "AI Index Rank" }, max: 200, higherIsBetter: false },
  { key: "aiIndexPrice", label: { zh: "AI Index Price", en: "AI Index Price" }, max: 100, higherIsBetter: false },
  { key: "aiIndexSpeed", label: { zh: "AI Index Speed", en: "AI Index Speed" }, max: 250 },
  { key: "aiIndexLatency", label: { zh: "AI Index Latency", en: "AI Index Latency" }, max: 250, higherIsBetter: false },
  { key: "aiIndexTotalResponse", label: { zh: "AI Index Total Response", en: "AI Index Total Response" }, max: 250, higherIsBetter: false },
  { key: "lmArenaScore", label: { zh: "LM Arena Score", en: "LM Arena Score" }, max: 1600 },
  { key: "lmArenaRank", label: { zh: "LM Arena Rank", en: "LM Arena Rank" }, max: 300, higherIsBetter: false },
  { key: "lmArenaVotes", label: { zh: "LM Arena Votes", en: "LM Arena Votes" }, max: 100000 },
  { key: "lmArenaInputPrice", label: { zh: "LM Arena Input Price", en: "LM Arena Input Price" }, max: 20, higherIsBetter: false },
  { key: "lmArenaOutputPrice", label: { zh: "LM Arena Output Price", en: "LM Arena Output Price" }, max: 25, higherIsBetter: false },
  { key: "lmArenaContextWindow", label: { zh: "LM Arena Context Window", en: "LM Arena Context Window" }, max: 2000000 },
];

// Python equivalent:
// VIEW_OPTIONS = [
//     {"key": "overall", "label": "综合视图"},
//     {"key": "qualityAvg", "label": "教学平均分"},
//     {"key": "benchmarkAvg", "label": "综合基准分"},
//     *[item for item in QUALITY_METRICS if item["key"] != "qualityAvg"],
//     *[item for item in BENCHMARK_METRICS if item["key"] != "benchmarkAvg"],
// ]
export const VIEW_OPTIONS = [
  { key: "overall", label: { zh: "综合视图", en: "Overview" } },
  { key: "qualityAvg", label: { zh: "教学平均分", en: "Teaching Avg" } },
  { key: "benchmarkAvg", label: { zh: "综合基准分", en: "Benchmark Avg" } },
  ...QUALITY_METRICS.filter((item) => item.key !== "qualityAvg"),
  ...BENCHMARK_METRICS.filter((item) => item.key !== "benchmarkAvg"),
];

// Python equivalent:
// def score_value(model, key):
//     if key == "overall":
//         values = [
//             value
//             for value in [model.get("qualityAvg"), model.get("benchmarkAvg")]
//             if value is not None
//         ]
//         if not values:
//             return None
//         return (
//             model.get("qualityAvg", 0) * 20 * 0.35 + model.get("benchmarkAvg", 0) * 0.65
//             if len(values) == 2
//             else values[0]
//         )
//     return model.get(key)
export function scoreValue(model, key) {
  if (key === "overall") {
    const values = [model.qualityAvg, model.benchmarkAvg].filter(
      (value) => value != null,
    );
    if (!values.length) return null;
    return values.length === 2 ? model.qualityAvg * 20 * 0.35 + model.benchmarkAvg * 0.65 : values[0];
  }
  return model[key];
}

// Python equivalent:
// def score_max(key):
//     if key == "overall":
//         return 100
//     all_metrics = [*QUALITY_METRICS, *BENCHMARK_METRICS]
//     return next((item["max"] for item in all_metrics if item["key"] == key), 100)
export function scoreMax(key) {
  if (key === "overall") return 100;
  const all = [...QUALITY_METRICS, ...BENCHMARK_METRICS];
  return all.find((item) => item.key === key)?.max ?? 100;
}

function metricMeta(key) {
  if (key === "overall") return { max: 100, higherIsBetter: true };
  return [...QUALITY_METRICS, ...BENCHMARK_METRICS].find((item) => item.key === key) ?? { max: 100, higherIsBetter: true };
}

function metricSortValue(model, key) {
  const value = scoreValue(model, key);
  if (value == null) return null;
  return metricMeta(key).higherIsBetter === false ? -value : value;
}

function parseCurrencyNumber(value) {
  if (value == null) return null;
  const matched = String(value).match(/-?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : null;
}

function parseScaledNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim().toUpperCase();
  const matched = raw.match(/(-?\d+(?:\.\d+)?)([KM])?/);
  if (!matched) return null;
  const base = Number(matched[1]);
  if (matched[2] === "K") return base * 1000;
  if (matched[2] === "M") return base * 1000000;
  return base;
}

// Python equivalent:
// def label_for(key):
//     if key == "overall":
//         return "综合得分"
//     return next((item["label"] for item in VIEW_OPTIONS if item["key"] == key), key)
export function labelFor(key, locale = "zh") {
  if (key === "overall") return locale === "en" ? "Overall Score" : "综合得分";
  const label = VIEW_OPTIONS.find((item) => item.key === key)?.label;
  return typeof label === "string" ? label : (label?.[locale] ?? label?.zh ?? key);
}

const TAB_ICONS = {
  overall: "◫",
  qualityAvg: "◔",
  benchmarkAvg: "⌁",
  knowledge: "☰",
  guided: "➜",
  crossDiscipline: "✣",
  scenario: "✦",
  mmluPro: "◎",
  math: "⊟",
  ifeval: "☷",
  ceval: "⋄",
  humaneval: "</>",
  lcbCode: "⌘",
  aime2024: "△",
  simpleQa: "◌",
  chineseSimpleQa: "文",
  instruction: "↳",
  worldKnowledge: "◍",
  reasoning: "⋯",
  aiIndexScore: "◫",
  aiIndexRank: "#",
  aiIndexPrice: "$",
  aiIndexSpeed: "⇥",
  aiIndexLatency: "◔",
  aiIndexTotalResponse: "◷",
  lmArenaScore: "◫",
  lmArenaRank: "#",
  lmArenaVotes: "◉",
  lmArenaInputPrice: "$",
  lmArenaOutputPrice: "↗",
  lmArenaContextWindow: "⌂",
};

function localizedLabel(label, locale) {
  return typeof label === "string" ? label : (label?.[locale] ?? label?.zh ?? "");
}

export function useLeaderboardData({ activeView, query }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(appUrl("/data/quantitive/main_experiments.csv"));
      const text = await response.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ""));
      const items = rows.slice(1).map((cols) => ({
        name: cols[0]?.trim() ?? "",
        version: cols[1]?.trim() ?? "",
        note: cols[45]?.trim() || cols[2]?.trim() || "",
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
        aiIndexRank: parseNumber(cols[30]),
        aiIndexScore: parseNumber(cols[31]),
        aiIndexPrice: parseCurrencyNumber(cols[32]),
        aiIndexSpeed: parseNumber(cols[33]),
        aiIndexLatency: parseNumber(cols[34]),
        aiIndexTotalResponse: parseNumber(cols[35]),
        lmArenaRank: parseNumber(cols[46]),
        lmArenaScore: parseNumber(cols[48]),
        lmArenaVotes: parseNumber(cols[51]),
        lmArenaInputPrice: parseCurrencyNumber(cols[53]),
        lmArenaOutputPrice: parseCurrencyNumber(cols[54]),
        lmArenaContextWindow: parseScaledNumber(cols[55]),
      }));

      setModels(items);
      setSelectedModel(items[0] ?? null);
    }

    load();
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
      .map((model) => ({
        ...model,
        activeScore: scoreValue(model, activeView),
        activeSortValue: metricSortValue(model, activeView),
      }))
      .filter((model) => model.activeScore != null && model.activeSortValue != null)
      .sort((a, b) => (b.activeSortValue ?? -Infinity) - (a.activeSortValue ?? -Infinity));
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

  return {
    domesticCount: models.filter((item) => item.note.includes("国内")).length,
    foreignCount: models.filter((item) => item.note.includes("国外")).length,
    leader: ranked[0],
    models,
    ranked,
    selectedModel,
    setSelectedModel,
  };
}

function metricRank(models, targetModel, metricKey) {
  const ranked = models
    .map((item) => ({ ...item, sortValue: metricSortValue(item, metricKey) }))
    .filter((item) => item.sortValue != null)
    .sort((a, b) => (b.sortValue ?? -Infinity) - (a.sortValue ?? -Infinity));
  const index = ranked.findIndex((item) => item.name === targetModel.name);
  return index >= 0 ? `${index + 1}/${ranked.length}` : "--";
}

function LeaderboardView({
  activeView,
  domesticCount,
  foreignCount,
  locale,
  leader,
  models,
  query,
  ranked,
  selectedModel,
  setActiveView,
  setQuery,
  setSelectedModel,
}) {
  const [chartMode, setChartMode] = useState("bar");
  const [benchmarkQuery, setBenchmarkQuery] = useState("");
  const copy = locale === "en" ? {
    pageTitle: "Education Leaderboard",
    eyebrow: "llm leaderboard",
    title: "A dual-axis leaderboard for teaching ability and public benchmarks",
    hero: "A React visualization generated directly from local CSV files, combining teaching-dimension ratings and public benchmarks into a filterable, switchable, single-model-inspection leaderboard page.",
    modelCount: "Models",
    topModel: "Top model",
    domestic: "Domestic",
    foreign: "International",
    search: "Search model / note / version",
    benchmarkFilter: "Filter benchmark tabs / metrics",
    rankingSuffix: "Ranking",
    rankingNote: "Sorted automatically by the current view",
    uncategorized: "Uncategorized",
    noResults: "No matching results.",
    untagged: "No note",
    overall: "Overall",
    teachingAvg: "Teaching Avg",
    benchmarkAvg: "Benchmark Avg",
    teachingMetrics: "Teaching Metrics",
    benchmarkMetrics: "Benchmark Metrics",
    fiveScale: "5-point scale",
    hundredScale: "100-point scale",
    pickModel: "Select a model on the left to inspect detailed scores.",
  } : {
    pageTitle: "行业榜单",
    eyebrow: "llm leaderboard",
    title: "教学能力与通用基准的双轴榜单",
    hero: "从本地 CSV 直接生成的 React 可视化，聚合教学维度打分与公开 benchmark，用最少文件提供一个可筛选、可切换维度、可查看单模型细节的榜单页面。",
    modelCount: "模型数量",
    topModel: "当前榜首",
    domestic: "国内模型",
    foreign: "国外模型",
    search: "搜索模型名 / 备注 / 版本号",
    benchmarkFilter: "筛选 benchmark 维度",
    rankingSuffix: "排行",
    rankingNote: "按当前维度自动排序",
    uncategorized: "未分类",
    noResults: "没有匹配结果。",
    untagged: "未备注",
    overall: "综合得分",
    teachingAvg: "教学平均分",
    benchmarkAvg: "综合基准分",
    teachingMetrics: "教学维度",
    benchmarkMetrics: "Benchmark 维度",
    fiveScale: "5 分制",
    hundredScale: "百分制",
    pickModel: "选择左侧模型以查看详细得分。",
  };

  const visibleViewOptions = useMemo(() => {
    const normalized = benchmarkQuery.trim().toLowerCase();
    return VIEW_OPTIONS.filter((option) => {
      if (option.key === activeView) return true;
      if (!normalized) return true;
      const label = typeof option.label === "string" ? option.label : (option.label?.[locale] ?? option.label?.zh ?? "");
      return label.toLowerCase().includes(normalized);
    });
  }, [activeView, benchmarkQuery, locale]);

  const visibleBenchmarkMetrics = useMemo(() => {
    const normalized = benchmarkQuery.trim().toLowerCase();
    return BENCHMARK_METRICS.filter((metric) => {
      if (!normalized) return true;
      const label = localizedLabel(metric.label, locale);
      return label.toLowerCase().includes(normalized);
    });
  }, [benchmarkQuery, locale]);

  const activeMetricRange = useMemo(() => {
    const values = ranked.map((model) => model.activeScore).filter((value) => value != null);
    if (!values.length) return { min: 0, max: 0 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [ranked]);

  return (
    <>
      <section className="leaderboard-header">
        <div className="leaderboard-title">
          <span className="leaderboard-title-icon" aria-hidden="true">☷</span>
          <span>{copy.pageTitle}</span>
        </div>
        <div className="controls">
          <div className="tabs">
            {visibleViewOptions.map((option) => (
              <button
                key={option.key}
                className={`tab ${activeView === option.key ? "active" : ""}`}
                onClick={() => setActiveView(option.key)}
                type="button"
              >
                <span className="tab-icon" aria-hidden="true">{TAB_ICONS[option.key] ?? "•"}</span>
                <span className="tab-label">
                  {typeof option.label === "string" ? option.label : (option.label?.[locale] ?? option.label?.zh)}
                </span>
              </button>
            ))}
          </div>
          <label className="search benchmark-filter">
            <input
              value={benchmarkQuery}
              onChange={(event) => setBenchmarkQuery(event.target.value)}
              placeholder={copy.benchmarkFilter}
            />
          </label>
        </div>
      </section>

      <section className="layout">
        <article className="chart-panel">
          <div className="chart-toolbar">
            <div className="chart-mode-tabs">
              <button
                type="button"
                className={`chart-mode-tab ${chartMode === "bar" ? "active" : ""}`}
                onClick={() => setChartMode("bar")}
              >
                <span className="chart-mode-icon" aria-hidden="true">▤</span>
                <span>Bar Chart</span>
              </button>
              <button
                type="button"
                className={`chart-mode-tab ${chartMode === "table" ? "active" : ""}`}
                onClick={() => setChartMode("table")}
              >
                <span className="chart-mode-icon" aria-hidden="true">☷</span>
                <span>Table</span>
              </button>
            </div>
            <span className="section-title" style={{ margin: 0 }}>
              <span>{copy.rankingNote}</span>
            </span>
          </div>
          {ranked.length ? (
            chartMode === "bar" ? (
              <div className="bars">
                {ranked.map((model, index) => {
                  const { min, max } = activeMetricRange;
                  const higherIsBetter = metricMeta(activeView).higherIsBetter !== false;
                  const normalized = max === min
                    ? 1
                    : higherIsBetter
                      ? (model.activeScore - min) / (max - min)
                      : (max - model.activeScore) / (max - min);
                  const width = Math.max(6, normalized * 100);
                  return (
                    <button
                      key={model.name}
                      className="bar-row"
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div className="bar-rank">{index + 1}</div>
                      <div className="bar-label">
                        <strong>{model.name}</strong>
                        <span>{model.note || copy.untagged}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.min(width, 100)}%` }} />
                      </div>
                      <div className="bar-value">{formatScore(model.activeScore)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rank-table">
                <div className="rank-table-head">
                  <span>{locale === "en" ? "Rank" : "排名"}</span>
                  <span>{locale === "en" ? "Model" : "模型"}</span>
                  <span>{locale === "en" ? "Score" : "得分"}</span>
                  <span>{locale === "en" ? "Teaching" : "教学均分"}</span>
                  <span>{locale === "en" ? "Benchmark" : "Benchmark 均分"}</span>
                </div>
                {ranked.map((model, index) => {
                  return (
                    <button
                      key={model.name}
                      className={`rank-row ${selectedModel?.name === model.name ? "active" : ""}`}
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div className="rank-cell-rank">{index + 1}</div>
                      <div className="rank-cell-model">
                        <div className="rank-primary">{model.name}</div>
                        <div className="rank-secondary">
                          {model.note || copy.untagged}
                          {model.version ? ` · v${model.version}` : ""}
                        </div>
                      </div>
                      <div className="rank-cell-score">{formatScore(model.activeScore)}</div>
                      <div className="rank-cell-quality">{formatScore(model.qualityAvg)}</div>
                      <div className="rank-cell-benchmark">{formatScore(model.benchmarkAvg)}</div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="empty">{copy.noResults}</div>
          )}
        </article>

        <aside className="detail-panel">
          {selectedModel ? (
            <>
              <div className="detail-header">
                <div className="detail-topline">
                  <span className="detail-brand">{selectedModel.note || copy.untagged}</span>
                  <span className="detail-chip">
                    {copy.overall} {formatScore(scoreValue(selectedModel, "overall"))}
                  </span>
                </div>
                <div>
                  <h3>{selectedModel.name}</h3>
                  <div className="detail-subline">
                    {selectedModel.version ? `v${selectedModel.version}` : copy.untagged}
                  </div>
                </div>
              </div>

              <div className="score-grid">
                <div className="score-card">
                  <span>{locale === "en" ? "Version" : "版本"}</span>
                  <strong>{selectedModel.version ? `v${selectedModel.version}` : "--"}</strong>
                </div>
                <div className="score-card">
                  <span>{locale === "en" ? "Category" : "类别"}</span>
                  <strong>{selectedModel.note || copy.untagged}</strong>
                </div>
                <div className="score-card">
                  <span>{copy.teachingAvg}</span>
                  <strong>{formatScore(selectedModel.qualityAvg)}</strong>
                </div>
                <div className="score-card">
                  <span>{copy.benchmarkAvg}</span>
                  <strong>{formatScore(selectedModel.benchmarkAvg)}</strong>
                </div>
              </div>

              <div className="spec-grid">
                {QUALITY_METRICS.filter((metric) => metric.key !== "qualityAvg").map((metric) => (
                  <div key={metric.key} className="spec-card">
                    <span>{localizedLabel(metric.label, locale)}</span>
                    <strong>{formatScore(selectedModel[metric.key])}</strong>
                  </div>
                ))}
              </div>

              <div className="section-title" style={{ marginTop: 18 }}>
                <h3>{copy.benchmarkMetrics}</h3>
                <span>{locale === "en" ? "Score / Rank" : "分数 / 排名"}</span>
              </div>
              <div className="benchmark-card">
                <div className="benchmark-table">
                  <div className="benchmark-table-head">
                    <span>{locale === "en" ? "Benchmark" : "指标"}</span>
                    <span>{locale === "en" ? "Score" : "分数"}</span>
                    <span>{locale === "en" ? "Rank" : "排名"}</span>
                  </div>
                  {visibleBenchmarkMetrics.map((metric) => {
                    const value = selectedModel[metric.key];
                    return (
                      <div key={metric.key} className="benchmark-row">
                        <span className="benchmark-name">{localizedLabel(metric.label, locale)}</span>
                        <span className="benchmark-score">{formatScore(value)}</span>
                        <span className="benchmark-rank">{metricRank(models, selectedModel, metric.key)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="empty">{copy.pickModel}</div>
          )}
        </aside>
      </section>
    </>
  );
}

export function Leaderboard({
  activeView,
  locale = "zh",
  query,
  setActiveView,
  setQuery,
}) {
  const {
    domesticCount,
    foreignCount,
    leader,
    models,
    ranked,
    selectedModel,
    setSelectedModel,
  } = useLeaderboardData({ activeView, query });

  return (
    <LeaderboardView
      activeView={activeView}
      domesticCount={domesticCount}
      foreignCount={foreignCount}
      locale={locale}
      leader={leader}
      models={models}
      query={query}
      ranked={ranked}
      selectedModel={selectedModel}
      setActiveView={setActiveView}
      setQuery={setQuery}
      setSelectedModel={setSelectedModel}
    />
  );
}
