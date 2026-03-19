import React, { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  clampRating,
  createEmptyRatings,
  formatScore,
  normalizeQualitativeRecord,
  normalizeRatings,
  sliderValue,
} from "./qualitativeUtils";

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

export function WorkspaceTopbar({ activeSection, modelCount }) {
  const isLeaderboard = activeSection === "leaderboard";

  return (
    <div className="content-topbar">
      <div className="topbar-title">
        {isLeaderboard ? "Leaderboard Workspace" : "Qualitative Workspace"}
        <strong>{isLeaderboard ? "教学能力与通用基准榜单" : "质性对话评审"}</strong>
      </div>
      <div className="topbar-meta">
        {isLeaderboard ? `${modelCount || 0} models loaded` : "annotation workspace"}
      </div>
    </div>
  );
}

export function Annotation() {
  const [messageOptions, setMessageOptions] = useState([]);
  const [selectedMessageFile, setSelectedMessageFile] = useState("");
  const [record, setRecord] = useState(null);
  const [savedScoreFile, setSavedScoreFile] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyRatings(null));
  const [saveState, setSaveState] = useState("");

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
                {OVERVIEW_FIELDS.map((field) => (
                  <label key={field.key} className="field">
                    <div className="slider-head">
                      <span>{field.label}</span>
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
              {record.messages.map((message, index) => (
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
              ))}
            </div>
          </article>
        </div>
      ) : (
        <div className="empty">质性记录加载中。</div>
      )}
    </section>
  );
}
