import React, { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ANNOTATION_CSS } from "./Annotation";
import { appUrl } from "./appUrl";
import { TypeaheadDropdown } from "./Components";
import { normalizeQualitativeRecord } from "./qualitativeUtils";

export const PAIRWISE_CSS = `
  ${ANNOTATION_CSS}

  .pairwise {
    position: relative;
    padding: 18px;
    padding-bottom: 112px;
  }

  .pairwise-debug-floating {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 18;
    margin: 0;
    width: min(100%, 420px);
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(16, 20, 23, 0.62);
    backdrop-filter: blur(8px);
    color: rgba(233, 237, 240, 0.62);
    font: 10px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
  }

  .pairwise-hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: start;
    margin-bottom: 18px;
  }

  .pairwise-hero h2 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .pairwise-hero-copy {
    position: relative;
    display: inline-grid;
    gap: 10px;
  }

  .pairwise-hero-hint {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.01em;
  }

  .pairwise-hero-hint::before {
    content: "⌕";
    font-size: 12px;
    line-height: 1;
  }

  .pairwise-hero-hover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 5;
    width: min(560px, calc(100vw - 96px));
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(25, 24, 22, 0.94);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px);
    transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
    pointer-events: none;
  }

  .pairwise-hero-copy:hover .pairwise-hero-hover,
  .pairwise-hero-copy:focus-within .pairwise-hero-hover {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }

  .pairwise-hero-hover p {
    margin: 0;
    max-width: 58ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .pairwise-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .pairwise-layout {
    display: grid;
    gap: 18px;
  }

  .pairwise-bottom-bar {
    position: sticky;
    bottom: 18px;
    z-index: 12;
    display: flex;
    justify-content: center;
    margin-top: 22px;
    pointer-events: none;
  }

  .pairwise-bottom-inner {
    width: min(720px, calc(100% - 24px));
    padding: 10px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(34, 33, 30, 0.92);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .pairwise-candidates,
  .pairwise-scorecard {
    padding: 16px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .pairwise-scorecard {
    padding: 16px;
  }

  .pairwise-candidate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .pairwise-candidate-card {
    padding: 14px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .pairwise-candidate-card[data-slot="a"] {
    border-color: rgba(63, 155, 161, 0.28);
    background: rgba(63, 155, 161, 0.08);
  }

  .pairwise-candidate-card[data-slot="b"] {
    border-color: rgba(208, 119, 65, 0.28);
    background: rgba(208, 119, 65, 0.08);
  }

  .pairwise-candidate-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .candidate-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.12);
  }

  .candidate-name {
    font-size: 13px;
    color: var(--muted);
  }

  .candidate-body {
    line-height: 1.7;
    word-break: break-word;
    min-width: 0;
    max-width: 100%;
  }

  .candidate-picker {
    margin-bottom: 12px;
    min-width: 0;
  }

  .typeahead {
    position: relative;
  }

  .typeahead-input {
    width: 100%;
  }

  .typeahead-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    max-height: 320px;
    overflow-y: auto;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: #101417;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  }

  .typeahead-option {
    width: 100%;
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .typeahead-option:hover,
  .typeahead-option.active {
    background: rgba(255, 255, 255, 0.08);
  }

  .typeahead-option-label {
    font-size: 13px;
    color: var(--text);
    overflow-wrap: anywhere;
  }

  .typeahead-option-meta {
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .typeahead-empty {
    padding: 10px 12px;
    color: var(--muted);
    font-size: 13px;
  }

  .pairwise-candidates .field,
  .pairwise-candidates .field select,
  .pairwise-candidates .conversation-list,
  .pairwise-candidates .message-card,
  .pairwise-candidates .message-body,
  .pairwise-candidates .tool-call,
  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre {
    min-width: 0;
    max-width: 100%;
  }

  .pairwise-candidates .field select {
    width: 100%;
  }

  .pairwise-candidates .message-body,
  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre,
  .pairwise-candidates .message-body code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre {
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .candidate-body > :first-child {
    margin-top: 0;
  }

  .candidate-body > :last-child {
    margin-bottom: 0;
  }

  .message-fold-toggle {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px dashed var(--line);
    background: rgba(255, 255, 255, 0.02);
    color: var(--muted);
    cursor: pointer;
    font: inherit;
  }

  .message-fold-toggle:hover {
    color: var(--text);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .conversation-filters {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .segment-group {
    display: grid;
    gap: 8px;
  }

  .scorecard-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin-top: 14px;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
  }

  .scorecard-toggle:hover {
    color: var(--text);
  }

  .scorecard-toggle-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--text);
    font-size: 12px;
    line-height: 1;
  }

  .segment-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .segment-options-inline {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .segment-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    color: var(--muted);
  }

  .segment-option.active {
    color: var(--text);
    border-color: transparent;
    background: linear-gradient(90deg, rgba(208, 119, 65, 0.4), rgba(63, 155, 161, 0.2));
  }

  .segment-option input {
    margin: 0;
    accent-color: var(--accent);
  }

  .pairwise-bottom-inner .segment-option {
    justify-content: center;
    min-height: 48px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
  }

  .pairwise-bottom-inner .segment-option span:last-child {
    white-space: nowrap;
  }

  .dimension-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }

  .dimension-card {
    padding: 10px 0 12px;
    border-radius: 0;
    border: 0;
    background: transparent;
  }

  .dimension-card strong {
    display: block;
    margin-bottom: 8px;
  }

  .dimension-card .segment-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .dimension-card .segment-option {
    justify-content: center;
    padding: 8px 10px;
    min-width: 0;
  }

  .pairwise-note {
    margin-top: 14px;
  }

  @media (max-width: 1080px) {
    .dimension-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .pairwise-hero {
      flex-direction: column;
    }

    .pairwise-hero-hover {
      position: static;
      width: 100%;
      margin-top: 6px;
    }

    .pairwise-candidate-grid,
    .dimension-grid {
      grid-template-columns: 1fr;
    }

    .segment-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pairwise-bottom-bar {
      bottom: 10px;
    }

    .pairwise-bottom-inner {
      width: 100%;
      padding: 8px;
    }

    .segment-options-inline {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;

const DIMENSIONS = [
  { key: "pedagogy", label: "专业性" },
  { key: "accuracy", label: "个性化" },
  { key: "clarity", label: "创造力" },
  { key: "completeness", label: "价值观" },
];

const CHOICE_OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "tie", label: "持平" },
];

const PAIRWISE_COPY = {
  zh: {
    workspace: "Pairwise Workspace",
    title: "Pairwise 质性评审",
    meta: "pairwise annotation workspace",
    eyebrow: "pairwise review",
    hoverHint: "悬停查看说明",
    hero: "将记录信息与完整消息流放在同一块面板里，再把候选回答和胜负判断拆到右侧，适合做 Arena 风格的 pairwise 标注。",
    pill: "记录、消息与 pairwise 评分联动",
    record: "记录与消息",
    recordInfo: "记录信息",
    candidates: "Pairwise 候选回答",
    scoring: "Pairwise 评分",
    stats: "评分概览",
    selectMessage: "选择消息文件",
    selectCandidateA: "选择候选 A 消息",
    selectCandidateB: "选择候选 B 消息",
    messagesUnit: "条消息",
    showTool: "显示 tool",
    showSystemPrompt: "显示 system prompt",
    preferred: "整体胜负",
    winnerOptions: [
      { value: "a", label: "A 更好" },
      { value: "b", label: "B 更好" },
      { value: "tie", label: "平局" },
      { value: "both_bad", label: "都不好" },
    ],
    dimension: "维度对比",
    confidence: "判定信心",
    note: "评审备注",
    dimensions: "维度评分",
    expandDimensions: "展开维度评分",
    collapseDimensions: "收起维度评分",
    expandConfidence: "展开判定信心",
    collapseConfidence: "收起判定信心",
    expandNote: "展开评审备注",
    collapseNote: "收起评审备注",
    expandSave: "展开保存操作",
    collapseSave: "收起保存操作",
    save: "保存 Pairwise 评分",
    saveHint: "优先写入服务端 qualitative ratings；如果接口不可用，则回退到浏览器本地存储。",
    loading: "Pairwise 记录加载中。",
    summaryCount: "已评分记录",
    summaryWinner: "当前胜者",
    noCandidate: "当前记录里没有明确的双候选回答，已回退为从 assistant 消息中提取示例内容。",
    candidateFallback: "暂无候选回答内容。",
    candidateA: "候选 A",
    candidateB: "候选 B",
  },
  en: {
    workspace: "Pairwise Workspace",
    title: "Pairwise Review",
    meta: "pairwise annotation workspace",
    eyebrow: "pairwise review",
    hoverHint: "Hover for details",
    hero: "This view combines record metadata with the full message stream, then separates candidate comparison and pairwise judgment into a dedicated scoring column.",
    pill: "Record, messages, and pairwise scoring",
    record: "Record and Messages",
    recordInfo: "Record Info",
    candidates: "Pairwise Candidates",
    scoring: "Pairwise Scoring",
    stats: "Rating Summary",
    selectMessage: "Message file",
    selectCandidateA: "Select candidate A message",
    selectCandidateB: "Select candidate B message",
    messagesUnit: "messages",
    showTool: "Show tool",
    showSystemPrompt: "Show system prompt",
    preferred: "Overall winner",
    winnerOptions: [
      { value: "a", label: "A Better" },
      { value: "b", label: "B Better" },
      { value: "tie", label: "Tie" },
      { value: "both_bad", label: "Both Bad" },
    ],
    dimension: "Dimension comparison",
    confidence: "Confidence",
    note: "Reviewer note",
    dimensions: "Dimension Scoring",
    expandDimensions: "Show dimension scoring",
    collapseDimensions: "Hide dimension scoring",
    expandConfidence: "Show confidence",
    collapseConfidence: "Hide confidence",
    expandNote: "Show reviewer note",
    collapseNote: "Hide reviewer note",
    expandSave: "Show save actions",
    collapseSave: "Hide save actions",
    save: "Save Pairwise Rating",
    saveHint: "Prefer writing to the server-side qualitative ratings endpoint; if unavailable, fall back to browser local storage.",
    loading: "Loading pairwise record.",
    summaryCount: "Rated records",
    summaryWinner: "Current winner",
    noCandidate: "No explicit pairwise candidates were found in this record. Falling back to assistant messages.",
    candidateFallback: "No candidate answer content found.",
    candidateA: "Candidate A",
    candidateB: "Candidate B",
  },
};

function createEmptyPairwiseRatings() {
  return {
    pairwise: {
      winner: "",
      confidence: "",
      note: "",
      pedagogy: "",
      accuracy: "",
      clarity: "",
      completeness: "",
    },
  };
}

function normalizeCandidate(rawCandidate, fallbackLabel) {
  if (!rawCandidate) {
    return {
      label: fallbackLabel,
      content: "",
      meta: "",
    };
  }

  if (typeof rawCandidate === "string") {
    return {
      label: fallbackLabel,
      content: rawCandidate,
      meta: "",
    };
  }

  return {
    label: rawCandidate.label ?? rawCandidate.name ?? rawCandidate.model ?? fallbackLabel,
    content:
      rawCandidate.content
      ?? rawCandidate.text
      ?? rawCandidate.response
      ?? rawCandidate.answer
      ?? rawCandidate.output
      ?? "",
    meta: rawCandidate.model ?? rawCandidate.id ?? rawCandidate.role ?? "",
  };
}

function derivePairwiseCandidates(source, record, copy) {
  const directA =
    source?.candidateA
    ?? source?.candidate_a
    ?? source?.responseA
    ?? source?.response_a
    ?? source?.answerA
    ?? source?.answer_a
    ?? source?.chosen;
  const directB =
    source?.candidateB
    ?? source?.candidate_b
    ?? source?.responseB
    ?? source?.response_b
    ?? source?.answerB
    ?? source?.answer_b
    ?? source?.rejected;

  if (directA || directB) {
    return {
      candidates: [
        normalizeCandidate(directA, copy.candidateA),
        normalizeCandidate(directB, copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  if (Array.isArray(source?.candidates) && source.candidates.length >= 2) {
    return {
      candidates: [
        normalizeCandidate(source.candidates[0], copy.candidateA),
        normalizeCandidate(source.candidates[1], copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  if (Array.isArray(source?.responses) && source.responses.length >= 2) {
    return {
      candidates: [
        normalizeCandidate(source.responses[0], copy.candidateA),
        normalizeCandidate(source.responses[1], copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  const assistantMessages = (record?.messages ?? []).filter((message) => message?.role === "assistant");

  return {
    candidates: [
      normalizeCandidate(assistantMessages[0]?.content ?? "", copy.candidateA),
      normalizeCandidate(assistantMessages[1]?.content ?? "", copy.candidateB),
    ],
    usedFallback: true,
  };
}

function buildCandidateFromRecord(recordSource, normalizedRecord, fallbackLabel) {
  if (!recordSource || !normalizedRecord) {
    return {
      label: fallbackLabel,
      meta: "",
      messages: [],
      turnCount: 0,
    };
  }

  return {
    label: fallbackLabel,
    meta: normalizedRecord.scenario,
    messages: normalizedRecord.messages ?? [],
    turnCount: normalizedRecord.turn_count ?? (normalizedRecord.messages ?? []).length ?? 0,
  };
}

function renderMarkdown(value) {
  if (!value || typeof value !== "string") return null;
  return (
    <Markdown remarkPlugins={[remarkGfm]}>
      {value}
    </Markdown>
  );
}

function extractTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text ?? "";
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
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
  const textContent = extractTextContent(message?.content);
  if (textContent.trim()) {
    return renderMarkdown(textContent);
  }

  if (Array.isArray(message?.tool_calls) && message.tool_calls.length) {
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

function getMiddleMessagesToggleLabel(locale, hiddenCount, isExpanded) {
  if (locale === "en") {
    return isExpanded
      ? "Hide middle messages"
      : `Show ${hiddenCount} middle message${hiddenCount === 1 ? "" : "s"}`;
  }

  return isExpanded ? "收起中间过程" : `展开中间 ${hiddenCount} 条消息`;
}

function splitMessagePath(fileName) {
  return String(fileName || "")
    .split("/")
    .filter(Boolean);
}

function getCandidateQuestionFolder(fileName) {
  const parts = splitMessagePath(fileName);
  return parts.length > 2 ? parts.slice(0, -2).join("/") : "";
}

function getCandidateVariant(fileName) {
  const parts = splitMessagePath(fileName);
  return parts.length > 1 ? parts.slice(-2).join("/") : String(fileName || "");
}

function buildCandidateFileFromFolder(folderName, variantFile) {
  const folder = String(folderName || "").replace(/^\/+|\/+$/g, "");
  const variant = String(variantFile || "").replace(/^\/+|\/+$/g, "");
  if (!folder) return variant;
  if (!variant) return "";
  return `${folder}/${variant}`;
}

function pickDefaultCandidateBVariant(items, candidateAFile) {
  const candidateAVariant = getCandidateVariant(candidateAFile);
  const siblingVariants = items.map((item) => item.fileName);
  const uniqueVariants = [...new Set(siblingVariants)];
  return uniqueVariants.find((variant) => variant !== candidateAVariant) ?? uniqueVariants[0] ?? candidateAVariant;
}

function renderConversationMessageCard({
  message,
  messageIndex,
  slotKey,
}) {
  const role = message.role || "unknown";
  const messageKey = `${slotKey}-${role}-${messageIndex}-${message.tool_call_id || message.id || "message"}`;

  return (
    <div key={messageKey} className={`message-card ${role}`}>
      <div className="message-head">
        <div className="message-role">
          <span>{role}</span>
          {message.role === "tool" && message.tool_call_id ? (
            <span className="message-tool-call-id">{message.tool_call_id}</span>
          ) : null}
        </div>
        <div className="message-index">#{messageIndex + 1}</div>
      </div>
      <div className="message-body">
        {renderMessageContent(message)}
      </div>
    </div>
  );
}

export function PairwiseRating({ locale = "zh" }) {
  const copy = PAIRWISE_COPY[locale] ?? PAIRWISE_COPY.zh;
  const [messageOptions, setMessageOptions] = useState([]);
  const [candidateBOptions, setCandidateBOptions] = useState([]);
  const [selectedCandidateAFile, setSelectedCandidateAFile] = useState("");
  const [selectedCandidateBVariant, setSelectedCandidateBVariant] = useState("");
  const [candidateARawRecord, setCandidateARawRecord] = useState(null);
  const [candidateBRawRecord, setCandidateBRawRecord] = useState(null);
  const [candidateARecord, setCandidateARecord] = useState(null);
  const [candidateBRecord, setCandidateBRecord] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyPairwiseRatings());
  const [saveState, setSaveState] = useState("");
  const [showToolMessages, setShowToolMessages] = useState(true);
  const [showSystemMessages, setShowSystemMessages] = useState(false);
  const [expandedMiddleMessages, setExpandedMiddleMessages] = useState({});
  const [isSaveFolded, setIsSaveFolded] = useState(true);
  const [isDimensionFolded, setIsDimensionFolded] = useState(true);
  const [isConfidenceFolded, setIsConfidenceFolded] = useState(true);
  const [isNoteFolded, setIsNoteFolded] = useState(true);

  useEffect(() => {
    async function loadMessageOptions() {
      const response = await fetch(appUrl("/api/qualitative-messages?multi_model_only=1"));
      if (!response.ok) throw new Error(`message options failed:${response.status}`);

      const items = await response.json();
      setMessageOptions(items);
      if (items[0]?.fileName) {
        setSelectedCandidateAFile(items[0].fileName);
        setSelectedCandidateBVariant("");
      }
    }

    loadMessageOptions().catch(() => {
      setSaveState("消息列表加载失败。");
    });
  }, []);

  useEffect(() => {
    async function loadRatingFolderSummary() {
      const response = await fetch(appUrl("/api/qualitative-ratings-folder?kind=pairwise"));
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

  useEffect(() => {
    if (!selectedCandidateAFile) return;

    async function loadCandidateRecord() {
      const response = await fetch(
        appUrl(`/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateAFile)}`),
      );
      if (!response.ok) throw new Error(`candidate A failed:${response.status}`);

      const nextRaw = await response.json();
      setCandidateARawRecord(nextRaw);
      setCandidateARecord(normalizeQualitativeRecord(nextRaw, selectedCandidateAFile));
    }

    loadCandidateRecord().catch(() => {
      setCandidateARawRecord(null);
      setCandidateARecord(null);
    });
  }, [selectedCandidateAFile]);

  useEffect(() => {
    if (!selectedCandidateAFile) return;

    async function loadCandidateBOptions() {
      const response = await fetch(
        appUrl(`/api/qualitative-message-siblings?file=${encodeURIComponent(selectedCandidateAFile)}`),
      );
      if (!response.ok) throw new Error(`candidate B options failed:${response.status}`);

      const items = await response.json();
      setCandidateBOptions(items);
    }

    loadCandidateBOptions().catch(() => {
      setCandidateBOptions([]);
      setSelectedCandidateBVariant("");
    });
  }, [selectedCandidateAFile]);

  useEffect(() => {
    if (!candidateBOptions.length) {
      if (selectedCandidateBVariant) setSelectedCandidateBVariant("");
      return;
    }
    if (candidateBOptions.some((item) => item.fileName === selectedCandidateBVariant)) return;
    setSelectedCandidateBVariant(pickDefaultCandidateBVariant(candidateBOptions, selectedCandidateAFile));
  }, [candidateBOptions, selectedCandidateAFile, selectedCandidateBVariant]);

  useEffect(() => {
    if (!selectedCandidateAFile || !selectedCandidateBVariant) return;

    async function loadCandidateRecord() {
      const candidateAFolder = getCandidateQuestionFolder(selectedCandidateAFile);
      const response = await fetch(
        appUrl(
          `/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateBVariant)}&folder=${encodeURIComponent(candidateAFolder)}`,
        ),
      );
      if (!response.ok) throw new Error(`candidate B failed:${response.status}`);

      const nextRaw = await response.json();
      const resolvedCandidateBFile = buildCandidateFileFromFolder(candidateAFolder, selectedCandidateBVariant);
      setCandidateBRawRecord(nextRaw);
      setCandidateBRecord(normalizeQualitativeRecord(nextRaw, resolvedCandidateBFile));
    }

    loadCandidateRecord().catch(() => {
      setCandidateBRawRecord(null);
      setCandidateBRecord(null);
    });
  }, [selectedCandidateAFile, selectedCandidateBVariant]);

  const activeRecord = candidateARecord ?? candidateBRecord ?? null;

  useEffect(() => {
    setRatings(createEmptyPairwiseRatings());
  }, [activeRecord?.record_id]);

  const pairwiseCandidates = useMemo(() => {
    const candidateA = buildCandidateFromRecord(candidateARawRecord, candidateARecord, copy.candidateA);
    const candidateB = buildCandidateFromRecord(candidateBRawRecord, candidateBRecord, copy.candidateB);

    return {
      candidates: [candidateA, candidateB],
      usedFallback: !(candidateA.content && candidateB.content),
    };
  }, [candidateARecord, candidateARawRecord, candidateBRecord, candidateBRawRecord, copy.candidateA, copy.candidateB]);

  const ratingFolderDebugMessage = useMemo(() => {
    if (!ratingFolderSummary) return "pairwise folder summary: unavailable";
    const dirName = String(ratingFolderSummary.dir || "").split("/").filter(Boolean).at(-1) || "unknown";
    const latestFile = ratingFolderSummary.files?.[ratingFolderSummary.files.length - 1];
    const latestText = latestFile
      ? `latest: ${latestFile.name}\nlatestRecordCount: ${latestFile.recordCount}`
      : "latest: none";
    return `debug pairwise folder
dir: ${dirName}
fileCount: ${ratingFolderSummary.fileCount ?? 0}
${latestText}`;
  }, [ratingFolderSummary]);

  const ratingFolderDebugTitle = useMemo(() => {
    if (!ratingFolderSummary) return "pairwise folder summary unavailable";
    return JSON.stringify(ratingFolderSummary, null, 2);
  }, [ratingFolderSummary]);

  function updatePairwise(field, value) {
    const nextRatings = {
      ...ratings,
      pairwise: {
        ...ratings.pairwise,
        [field]: value,
      },
    };
    setRatings(nextRatings);
    return nextRatings;
  }

  function toggleMessage(index) {
    setCollapsedMessages((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function advanceToNextCandidates() {
    if (!messageOptions.length) return;

    const currentAIndex = messageOptions.findIndex((item) => item.fileName === selectedCandidateAFile);
    const nextCandidateA = messageOptions[currentAIndex >= 0 ? currentAIndex + 1 : 0];

    if (!nextCandidateA?.fileName) return;

    setSelectedCandidateAFile(nextCandidateA.fileName);
  }

  async function handleSave(ratingsOverride = ratings) {
    if (!activeRecord) return;
    const updatedAt = new Date().toISOString();
    const nextRecord = {
      record_id: activeRecord.record_id,
      scenario: activeRecord.scenario,
      question: activeRecord.question,
      turn_count: activeRecord.turn_count,
      updatedAt,
      pairwise: ratingsOverride.pairwise,
      pairwise_meta: {
        candidate_a_file: selectedCandidateAFile,
        candidate_b_file: buildCandidateFileFromFolder(
          getCandidateQuestionFolder(selectedCandidateAFile),
          selectedCandidateBVariant,
        ),
      },
    };
    const recordToSave = {
      version: 1,
      savedAt: updatedAt,
      records: {
        [activeRecord.record_id]: nextRecord,
      },
    };

    try {
      const response = await fetch(appUrl("/api/qualitative-ratings-save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordToSave),
      });

      if (!response.ok) throw new Error(`save failed:${response.status}`);

      await response.json();
      try {
        const folderResponse = await fetch(appUrl("/api/qualitative-ratings-folder?kind=pairwise"));
        if (folderResponse.ok) {
          const folderSummary = await folderResponse.json();
          setRatingFolderSummary(folderSummary);
        }
      } catch {}
      setSaveState("Pairwise 评分已保存到服务器端 JSON 文件。");
      advanceToNextCandidates();
    } catch (error) {
      const message = String(error?.message ?? "");
      if (message.includes("404")) {
        setSaveState("保存接口不存在，Pairwise 评分未保存。");
        return;
      }
      setSaveState("服务器保存失败，Pairwise 评分未保存。");
    }
  }

  function handleWinnerSelect(value) {
    const nextRatings = updatePairwise("winner", value);
    if (isSaveFolded) {
      handleSave(nextRatings);
    }
  }

  return (
    <>
      <section className="panel pairwise">
        <div className="pairwise-debug-floating" title={ratingFolderDebugTitle}>{ratingFolderDebugMessage}</div>
        {activeRecord ? (
          <div className="pairwise-layout">
            <article className="pairwise-candidates">
              <div className="conversation-toolbar">
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <h3>{copy.candidates}</h3>
                  <span>{activeRecord.record_id}</span>
                </div>
                <div className="conversation-filters">
                  <label className="conversation-filter">
                    <input
                      checked={showToolMessages}
                      onChange={(event) => setShowToolMessages(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{copy.showTool}</span>
                  </label>
                  <label className="conversation-filter">
                    <input
                      checked={showSystemMessages}
                      onChange={(event) => setShowSystemMessages(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{copy.showSystemPrompt}</span>
                  </label>
                </div>
              </div>
              <div className="pairwise-candidate-grid">
                {pairwiseCandidates.candidates.map((candidate, index) => {
                  const isCandidateA = index === 0;
                  const selectedFile = isCandidateA ? selectedCandidateAFile : selectedCandidateBVariant;
                  const setSelectedFile = isCandidateA ? setSelectedCandidateAFile : setSelectedCandidateBVariant;
                  const selectLabel = isCandidateA ? copy.selectCandidateA : copy.selectCandidateB;
                  const selectOptions = isCandidateA ? messageOptions : candidateBOptions;
                  const candidateMessages = candidate.messages.filter((message) => {
                    if (!showToolMessages && message.role === "tool") return false;
                    if (!showSystemMessages && message.role === "system") return false;
                    return true;
                  });
                  const hiddenMessageCount = Math.max(candidateMessages.length - 2, 0);
                  const middleMessagesKey = selectedFile || `${isCandidateA ? "a" : "b"}-${index}`;
                  const isMiddleExpanded = expandedMiddleMessages[middleMessagesKey] ?? false;

                  return (
                    <div
                      key={`${candidate.label}-${index}`}
                      className="pairwise-candidate-card"
                      data-slot={isCandidateA ? "a" : "b"}
                    >
                      {messageOptions.length ? (
                        <TypeaheadDropdown
                          fieldClassName="field candidate-picker"
                          label={selectLabel}
                          onChange={setSelectedFile}
                          options={selectOptions}
                          value={selectedFile}
                        />
                      ) : null}
                      <div className="pairwise-candidate-top">
                        <div className="message-role">
                          <span className="candidate-badge">{isCandidateA ? "A" : "B"}</span>
                          <span>{candidate.label}</span>
                        </div>
                        <span className="candidate-name">
                          {candidate.meta} · {candidate.turnCount ?? 0} {copy.messagesUnit}
                        </span>
                      </div>
                      <div className="candidate-body">
                        {candidateMessages.length ? (
                          <div className="conversation-list">
                            {candidateMessages.slice(0, 1).map((message, messageIndex) =>
                              renderConversationMessageCard({
                                message,
                                messageIndex,
                                slotKey: `${isCandidateA ? "a" : "b"}-${middleMessagesKey}`,
                              }),
                            )}

                            {hiddenMessageCount > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="message-fold-toggle"
                                  onClick={() => {
                                    setExpandedMiddleMessages((current) => ({
                                      ...current,
                                      [middleMessagesKey]: !isMiddleExpanded,
                                    }));
                                  }}
                                >
                                  {getMiddleMessagesToggleLabel(locale, hiddenMessageCount, isMiddleExpanded)}
                                </button>

                                {isMiddleExpanded
                                  ? candidateMessages.slice(1, -1).map((message, middleIndex) => {
                                    const actualIndex = middleIndex + 1;
                                    return renderConversationMessageCard({
                                      message,
                                      messageIndex: actualIndex,
                                      slotKey: `${isCandidateA ? "a" : "b"}-${middleMessagesKey}`,
                                    });
                                  })
                                  : null}
                              </>
                            ) : null}

                            {candidateMessages.length > 1
                              ? candidateMessages.slice(-1).map((message) =>
                                renderConversationMessageCard({
                                  message,
                                  messageIndex: candidateMessages.length - 1,
                                  slotKey: `${isCandidateA ? "a" : "b"}-${middleMessagesKey}`,
                                }),
                              )
                              : null}
                          </div>
                        ) : (
                          <p>{copy.candidateFallback}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="pairwise-scorecard">
              <div className="section-title">
                <h3>{copy.scoring}</h3>
                <span>{copy.stats}</span>
              </div>

              <button
                type="button"
                className="scorecard-toggle"
                onClick={() => setIsDimensionFolded((current) => !current)}
              >
                <span className="scorecard-toggle-indicator">{isDimensionFolded ? "+" : "-"}</span>
                <span>{isDimensionFolded ? copy.expandDimensions : copy.collapseDimensions}</span>
              </button>

              {isDimensionFolded ? null : (
                <div className="dimension-grid">
                  {DIMENSIONS.map((dimension) => (
                    <div key={dimension.key} className="dimension-card">
                      <strong>{dimension.label}</strong>
                      <div className="segment-options">
                        {CHOICE_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`segment-option ${ratings.pairwise[dimension.key] === option.value ? "active" : ""}`}
                          >
                            <input
                              checked={ratings.pairwise[dimension.key] === option.value}
                              name={dimension.key}
                              onChange={() => updatePairwise(dimension.key, option.value)}
                              type="radio"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="scorecard-toggle"
                onClick={() => setIsConfidenceFolded((current) => !current)}
              >
                <span className="scorecard-toggle-indicator">{isConfidenceFolded ? "+" : "-"}</span>
                <span>{isConfidenceFolded ? copy.expandConfidence : copy.collapseConfidence}</span>
              </button>

              {isConfidenceFolded ? null : (
                <label className="field pairwise-note">
                  <span>{copy.confidence}</span>
                  <select
                    value={ratings.pairwise.confidence}
                    onChange={(event) => updatePairwise("confidence", event.target.value)}
                  >
                    <option value="">--</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              )}

              <button
                type="button"
                className="scorecard-toggle"
                onClick={() => setIsNoteFolded((current) => !current)}
              >
                <span className="scorecard-toggle-indicator">{isNoteFolded ? "+" : "-"}</span>
                <span>{isNoteFolded ? copy.expandNote : copy.collapseNote}</span>
              </button>

              {isNoteFolded ? null : (
                <label className="field pairwise-note">
                  <span>{copy.note}</span>
                  <textarea
                    rows="4"
                    value={ratings.pairwise.note}
                    onChange={(event) => updatePairwise("note", event.target.value)}
                  />
                </label>
              )}

              <button
                type="button"
                className="scorecard-toggle"
                onClick={() => setIsSaveFolded((current) => !current)}
              >
                <span className="scorecard-toggle-indicator">{isSaveFolded ? "+" : "-"}</span>
                <span>{isSaveFolded ? copy.expandSave : copy.collapseSave}</span>
              </button>

              {isSaveFolded ? null : (
                <div className="save-row">
                  <button className="primary-btn" type="button" onClick={handleSave}>
                    {copy.save}
                  </button>
                  <span className="save-hint">{saveState || copy.saveHint}</span>
                </div>
              )}
            </article>

            <div className="pairwise-bottom-bar">
              <div className="pairwise-bottom-inner">
                <div className="segment-options segment-options-inline">
                  {copy.winnerOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`segment-option ${ratings.pairwise.winner === option.value ? "active" : ""}`}
                    >
                      <input
                        checked={ratings.pairwise.winner === option.value}
                        name="winner"
                        onChange={() => handleWinnerSelect(option.value)}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">{copy.loading}</div>
        )}
      </section>
    </>
  );
}
