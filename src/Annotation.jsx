import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { formatScore, sliderValue } from "./qualitativeUtils";

const OVERVIEW_FIELDS = [
  { key: "overall", label: "总体评价" },
  { key: "pedagogy", label: "教学引导" },
  { key: "accuracy", label: "答案准确性" },
  { key: "engagement", label: "互动启发性" },
];

export function Annotation({
  handleSaveRatings,
  messageOptions,
  ratingSummary,
  ratings,
  record,
  saveState,
  selectedMessageFile,
  setSelectedMessageFile,
  updateOverview,
}) {
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
