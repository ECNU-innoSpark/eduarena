import React, { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ANNOTATION_CSS } from "./Annotation";
import { TypeaheadDropdown } from "./Components";
import { normalizeQualitativeRecord } from "./qualitativeUtils";

export const PAIRWISE_CSS = `
  ${ANNOTATION_CSS}

  .pairwise {
    padding: 18px;
  }

  .pairwise-hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: end;
    margin-bottom: 18px;
  }

  .pairwise-hero h2 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .pairwise-hero p {
    margin: 0;
    max-width: 58ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .pairwise-layout {
    display: grid;
    gap: 18px;
  }

  .pairwise-candidates,
  .pairwise-scorecard {
    padding: 16px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .pairwise-scorecard {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
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

  .segment-group {
    display: grid;
    gap: 8px;
  }

  .segment-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .segment-options-inline {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
    .pairwise-candidate-grid,
    .dimension-grid {
      grid-template-columns: 1fr;
    }

    .segment-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;

const LOCAL_RATINGS_KEY = "hi-react-cc.qualitative-ratings";

const WINNER_OPTIONS = [
  { value: "a", label: "A 更好" },
  { value: "b", label: "B 更好" },
  { value: "tie", label: "平局" },
  { value: "both_bad", label: "都不好" },
];

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
    preferred: "整体胜负",
    dimension: "维度对比",
    confidence: "判定信心",
    note: "评审备注",
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
    preferred: "Overall winner",
    dimension: "Dimension comparison",
    confidence: "Confidence",
    note: "Reviewer note",
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

function readLocalRatings() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_RATINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalRatings(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(data));
}

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

function normalizePairwiseRatings(record, savedData) {
  const empty = createEmptyPairwiseRatings();
  const savedRecord = savedData?.records?.[record?.record_id];
  if (!savedRecord?.pairwise) return empty;

  return {
    pairwise: {
      ...empty.pairwise,
      ...savedRecord.pairwise,
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

export function PairwiseRating({ locale = "zh" }) {
  const copy = PAIRWISE_COPY[locale] ?? PAIRWISE_COPY.zh;
  const [messageOptions, setMessageOptions] = useState([]);
  const [selectedCandidateAFile, setSelectedCandidateAFile] = useState("");
  const [selectedCandidateBFile, setSelectedCandidateBFile] = useState("");
  const [candidateARawRecord, setCandidateARawRecord] = useState(null);
  const [candidateBRawRecord, setCandidateBRawRecord] = useState(null);
  const [candidateARecord, setCandidateARecord] = useState(null);
  const [candidateBRecord, setCandidateBRecord] = useState(null);
  const [savedRatingsFile, setSavedRatingsFile] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyPairwiseRatings());
  const [saveState, setSaveState] = useState("");
  const [showToolMessages, setShowToolMessages] = useState(true);

  useEffect(() => {
    async function loadRatings() {
      let scoreFile = readLocalRatings() ?? { version: 1, records: {} };

      try {
        const response = await fetch("/api/qualitative-ratings");
        if (response.ok) {
          scoreFile = await response.json();
          writeLocalRatings(scoreFile);
        } else {
          const fallbackResponse = await fetch("/data/qualitative/message_ratings.json");
          if (fallbackResponse.ok) {
            scoreFile = await fallbackResponse.json();
            writeLocalRatings(scoreFile);
          }
        }
      } catch {
        // Keep local cache when server file is unavailable.
      }

      setSavedRatingsFile(scoreFile);
    }

    loadRatings().catch(() => {
      setSaveState("Pairwise 评分文件加载失败。");
    });
  }, []);

  useEffect(() => {
    async function loadMessageOptions() {
      const response = await fetch("/api/qualitative-messages");
      if (!response.ok) throw new Error(`message options failed:${response.status}`);

      const items = await response.json();
      setMessageOptions(items);
      if (items[0]?.fileName) {
        setSelectedCandidateAFile(items[0].fileName);
        setSelectedCandidateBFile(items[1]?.fileName ?? items[0].fileName);
      }
    }

    loadMessageOptions().catch(() => {
      setSaveState("消息列表加载失败。");
    });
  }, []);

  useEffect(() => {
    async function loadRatingFolderSummary() {
      const response = await fetch("/api/qualitative-ratings-folder?kind=pairwise");
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
      const response = await fetch(`/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateAFile)}`);
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
    if (!selectedCandidateBFile) return;

    async function loadCandidateRecord() {
      const response = await fetch(`/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateBFile)}`);
      if (!response.ok) throw new Error(`candidate B failed:${response.status}`);

      const nextRaw = await response.json();
      setCandidateBRawRecord(nextRaw);
      setCandidateBRecord(normalizeQualitativeRecord(nextRaw, selectedCandidateBFile));
    }

    loadCandidateRecord().catch(() => {
      setCandidateBRawRecord(null);
      setCandidateBRecord(null);
    });
  }, [selectedCandidateBFile]);

  const activeRecord = candidateARecord ?? candidateBRecord ?? null;

  useEffect(() => {
    setRatings(normalizePairwiseRatings(activeRecord, savedRatingsFile));
  }, [activeRecord, savedRatingsFile]);

  const pairwiseCandidates = useMemo(() => {
    const candidateA = buildCandidateFromRecord(candidateARawRecord, candidateARecord, copy.candidateA);
    const candidateB = buildCandidateFromRecord(candidateBRawRecord, candidateBRecord, copy.candidateB);

    return {
      candidates: [candidateA, candidateB],
      usedFallback: !(candidateA.content && candidateB.content),
    };
  }, [candidateARecord, candidateARawRecord, candidateBRecord, candidateBRawRecord, copy.candidateA, copy.candidateB]);

  const pairwiseSummary = useMemo(() => {
    const mergedRecords = {
      ...(savedRatingsFile?.records ?? {}),
    };

    if (activeRecord?.record_id) {
      mergedRecords[activeRecord.record_id] = {
        ...(mergedRecords[activeRecord.record_id] ?? {}),
        record_id: activeRecord.record_id,
        pairwise: ratings.pairwise,
      };
    }

    const records = Object.values(mergedRecords);
    const pairwiseRecords = records.filter((item) => item?.pairwise?.winner);
    return {
      count: ratingFolderSummary?.fileCount ?? pairwiseRecords.length,
    };
  }, [activeRecord?.record_id, ratingFolderSummary?.fileCount, ratings.pairwise, savedRatingsFile]);

  function updatePairwise(field, value) {
    setRatings((current) => ({
      ...current,
      pairwise: {
        ...current.pairwise,
        [field]: value,
      },
    }));
  }

  function toggleMessage(index) {
    setCollapsedMessages((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  async function handleSave() {
    if (!activeRecord) return;

    const nextFile = {
      version: 1,
      savedAt: new Date().toISOString(),
      records: {
        ...(savedRatingsFile?.records ?? {}),
        [activeRecord.record_id]: {
          ...(savedRatingsFile?.records?.[activeRecord.record_id] ?? {}),
          record_id: activeRecord.record_id,
          scenario: activeRecord.scenario,
          question: activeRecord.question,
          turn_count: activeRecord.turn_count,
          updatedAt: new Date().toISOString(),
          pairwise: ratings.pairwise,
          pairwise_meta: {
            candidate_a_file: selectedCandidateAFile,
            candidate_b_file: selectedCandidateBFile,
          },
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

      if (!response.ok) throw new Error(`save failed:${response.status}`);

      const savedFile = await response.json();
      writeLocalRatings(savedFile);
      setSavedRatingsFile(savedFile);
      try {
        const folderResponse = await fetch("/api/qualitative-ratings-folder?kind=pairwise");
        if (folderResponse.ok) {
          const folderSummary = await folderResponse.json();
          setRatingFolderSummary(folderSummary);
        }
      } catch {}
      setSaveState("Pairwise 评分已保存到服务器端 JSON 文件。");
    } catch (error) {
      writeLocalRatings(nextFile);
      setSavedRatingsFile(nextFile);
      const message = String(error?.message ?? "");
      if (message.includes("404")) {
        setSaveState("保存接口不存在，Pairwise 评分已回退到当前浏览器本地存储。");
        return;
      }
      setSaveState("服务器保存失败，Pairwise 评分已暂存到当前浏览器本地。");
    }
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

      <section className="panel pairwise">
        <div className="pairwise-hero">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2>{copy.title}</h2>
            <p>{copy.hero}</p>
          </div>
          <div className="qualitative-meta">
            <span className="pill">{copy.summaryCount}: {pairwiseSummary.count}</span>
            <span className="pill">{copy.pill}</span>
            {pairwiseCandidates.candidates.length ? (
              <span className="pill">
                {pairwiseCandidates.candidates.reduce((sum, candidate) => sum + (candidate.turnCount ?? 0), 0)} {copy.messagesUnit}
              </span>
            ) : null}
          </div>
        </div>

        {activeRecord ? (
          <div className="pairwise-layout">
            <article className="pairwise-scorecard">
              <div className="section-title">
                <h3>{copy.scoring}</h3>
                <span>{copy.preferred}</span>
              </div>

              <div className="segment-group">
                <span>{copy.preferred}</span>
                <div className="segment-options segment-options-inline">
                  {WINNER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`segment-option ${ratings.pairwise.winner === option.value ? "active" : ""}`}
                    >
                      <input
                        checked={ratings.pairwise.winner === option.value}
                        name="winner"
                        onChange={() => updatePairwise("winner", option.value)}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

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

              <label className="field pairwise-note">
                <span>{copy.note}</span>
                <textarea
                  rows="4"
                  value={ratings.pairwise.note}
                  onChange={(event) => updatePairwise("note", event.target.value)}
                />
              </label>

              <div className="save-row">
                <button className="primary-btn" type="button" onClick={handleSave}>
                  {copy.save}
                </button>
                <span className="save-hint">{saveState || copy.saveHint}</span>
              </div>
            </article>

            <article className="pairwise-candidates">
              <div className="conversation-toolbar">
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <h3>{copy.candidates}</h3>
                  <span>{activeRecord.record_id}</span>
                </div>
                <label className="conversation-filter">
                  <input
                    checked={showToolMessages}
                    onChange={(event) => setShowToolMessages(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{copy.showTool}</span>
                </label>
              </div>
              <div className="pairwise-candidate-grid">
                {pairwiseCandidates.candidates.map((candidate, index) => {
                  const isCandidateA = index === 0;
                  const selectedFile = isCandidateA ? selectedCandidateAFile : selectedCandidateBFile;
                  const setSelectedFile = isCandidateA ? setSelectedCandidateAFile : setSelectedCandidateBFile;
                  const selectLabel = isCandidateA ? copy.selectCandidateA : copy.selectCandidateB;

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
                          options={messageOptions}
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
                        {candidate.messages?.length ? (
                          <div className="conversation-list">
                            {(showToolMessages
                              ? candidate.messages
                              : candidate.messages.filter((message) => message.role !== "tool")).map((message, messageIndex) => (
                                <div
                                  key={`${isCandidateA ? "a" : "b"}-${message.role || "unknown"}-${messageIndex}`}
                                  className={`message-card ${message.role || "unknown"}`}
                                >
                                  <div className="message-head">
                                    <div className="message-role">
                                      <span>{message.role || "unknown"}</span>
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
                              ))}
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
          </div>
        ) : (
          <div className="empty">{copy.loading}</div>
        )}
      </section>
    </>
  );
}
