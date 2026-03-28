import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ANNOTATION_CSS, Annotation } from "./Annotation";
import { PAIRWISE_CSS, PairwiseRating } from "./PairwiseRating";
import {
  LEADERBOARD_CSS,
  Leaderboard,
} from "./Leaderboard";

const APP_COPY = {
  zh: {
    sections: [
      { key: "pairwise", label: "对战", note: "记录、消息与双候选对比评分", icon: "⌕" },
      // { key: "qualitative", label: "新评审", note: "对话消息与人工评分", icon: "◔" },
      { key: "leaderboard", label: "榜单", note: "教学能力与通用基准双轴榜单", icon: "☷" },
    ],
    workspaceLabel: "更早",
    sidebarCopy: "教学榜单与质性评审工作台。左侧切换 workspace，右侧查看当前内容。",
    currentView: "当前视图",
    workspaceLeaderboard: "榜单",
    workspacePairwise: "搜索",
    workspaceQualitative: "新评审",
    modelRanking: "模型排行",
    messageReview: "消息评审",
    pairwiseReview: "Pairwise 评审",
    annotationDesk: "单条对话评分工作台",
    pairwiseDesk: "记录与消息合并的双候选评审台",
    langLabel: "语言",
    langZh: "中文",
    langEn: "English",
  },
  en: {
    sections: [
      { key: "pairwise", label: "Arena", note: "Record, messages, and pairwise scoring", icon: "⌕" },
      { key: "leaderboard", label: "Leaderboard", note: "Teaching ability and benchmark ranking", icon: "☷" },
      // { key: "qualitative", label: "New Chat", note: "Conversation messages and human ratings", icon: "◔" },
    ],
    workspaceLabel: "Older",
    sidebarCopy: "A workspace for teaching leaderboards and qualitative review. Switch workspaces on the left and inspect content on the right.",
    currentView: "Current View",
    workspaceLeaderboard: "leaderboard",
    workspacePairwise: "search",
    workspaceQualitative: "new-chat",
    modelRanking: "Model Ranking",
    messageReview: "Message Review",
    pairwiseReview: "Pairwise Review",
    annotationDesk: "Single-conversation rating workspace",
    pairwiseDesk: "Merged record-and-message pairwise workspace",
    langLabel: "Language",
    langZh: "中文",
    langEn: "English",
  },
};

// 模仿 图中的侧边栏 只需要鼠标hover的时候显示 鼠标移动以后就不要显示
const APP_SHELL_CSS = `
  :root {
    color-scheme: dark;
    font-family: "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
    --bg: #1f1f1d;
    --sidebar: #22221f;
    --sidebar-soft: #292824;
    --panel: rgba(54, 47, 42, 0.82);
    --panel-strong: rgba(63, 55, 49, 0.95);
    --text: #f3f1ec;
    --muted: #aaa69d;
    --line: rgba(255, 255, 255, 0.08);
    --accent: #2b2b28;
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
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .sidebar {
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: linear-gradient(180deg, #252520 0%, #22221f 100%);
    border-right: 1px solid var(--line);
    min-height: 100vh;
    position: sticky;
    top: 0;
  }

  .sidebar-head {
    padding: 12px 12px 8px;
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 0;
  }

  .brand-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .brand-title::before {
    content: "🏛";
    font-size: 18px;
    filter: grayscale(1) brightness(1.25);
  }

  .brand h2 {
    margin: 0;
    font-family: "Iowan Old Style", "Times New Roman", serif;
    font-size: 24px;
    letter-spacing: -0.05em;
    font-weight: 600;
  }

  .brand-caret {
    color: var(--muted);
    font-size: 12px;
  }

  .top-actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
  }

  .sidebar-copy {
    display: none;
  }

  .sidebar-nav {
    padding: 8px;
  }

  .mode-switcher {
    display: grid;
    gap: 2px;
  }

  .sidebar-group {
    margin-top: 28px;
  }

  .sidebar-label {
    margin: 0 0 10px 6px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
  }

  .mode-tab {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 10px 10px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    transition: 180ms ease;
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }

  .mode-tab:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .mode-tab.active {
    background: rgba(255, 255, 255, 0.05);
  }

  .mode-tab-icon {
    display: block;
    color: #ebe7de;
    font-size: 14px;
    line-height: 1.5;
  }

  .mode-tab-body {
    display: block;
    min-width: 0;
  }

  .mode-tab strong {
    display: block;
    font-size: 14px;
    font-family: "SF Pro Text", "PingFang SC", sans-serif;
    font-weight: 500;
    margin-bottom: 0;
  }

  .mode-tab-body > span {
    display: block;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transform: translateY(-4px);
    transition: max-height 180ms ease, opacity 180ms ease, transform 180ms ease, margin-top 180ms ease;
  }

  .mode-tab:hover .mode-tab-body > span {
    max-height: 48px;
    opacity: 1;
    margin-top: 4px;
    transform: translateY(0);
  }

  .sidebar-foot {
    padding: 12px;
    border-top: 1px solid var(--line);
  }

  .workspace-item {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 8px 10px;
    background: transparent;
    color: var(--text);
    cursor: default;
    text-align: left;
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }

  .workspace-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .workspace-item-mark {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.6;
  }

  .workspace-item-title {
    display: block;
    font-size: 14px;
    font-weight: 400;
  }

  .account-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }

  .account-avatar {
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: radial-gradient(circle at 35% 30%, #d57a35, #824019 55%, #2b180c 100%);
  }

  .content {
    min-width: 0;
    padding: 18px;
  }

  .workspace {
    max-width: 1380px;
  }

  @media (max-width: 920px) {
    .app {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
      min-height: auto;
    }
  }

  @media (max-width: 640px) {
    .app {
      padding: 18px 14px 40px;
    }
  }
`;

const css = `${APP_SHELL_CSS}\n${ANNOTATION_CSS}\n${PAIRWISE_CSS}\n${LEADERBOARD_CSS}`;

function App() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("pairwise");
  const [activeView, setActiveView] = useState("overall");
  const [locale, setLocale] = useState("en");
  const copy = APP_COPY[locale];
  const sections = copy.sections;

  return (
    <>
      <style>{css}</style>
      <main className="app">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="brand">
              <div className="brand-title">
                <h2>EduArena</h2>
                <span className="brand-caret">⌄</span>
              </div>
              <div className="top-actions">
                <button
                  className="icon-btn"
                  onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
                  type="button"
                >
                  {locale === "zh" ? "中" : "En"}
                </button>
                <button className="icon-btn" type="button">◫</button>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="mode-switcher">
              {sections.map((section) => (
                <button
                  key={section.key}
                  className={`mode-tab ${activeSection === section.key ? "active" : ""}`}
                  onClick={() => setActiveSection(section.key)}
                  type="button"
                >
                  <span className="mode-tab-icon" aria-hidden="true">{section.icon}</span>
                  <span className="mode-tab-body">
                    <strong>{section.label}</strong>
                    <span>{section.note}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="sidebar-group">
              <div className="sidebar-label">{copy.workspaceLabel}</div>
              <button className="workspace-item" type="button">
                <span className="workspace-item-mark" aria-hidden="true">✕</span>
                <span className="workspace-item-title">
                  {activeSection === "leaderboard"
                    ? copy.workspaceLeaderboard
                    : activeSection === "pairwise"
                      ? copy.workspacePairwise
                      : copy.workspaceQualitative}
                </span>
              </button>
              <button className="workspace-item" type="button">
                <span className="workspace-item-mark" aria-hidden="true">✕</span>
                <span className="workspace-item-title">
                  {activeSection === "leaderboard"
                    ? copy.modelRanking
                    : activeSection === "pairwise"
                      ? copy.pairwiseReview
                      : copy.messageReview}
                </span>
              </button>
            </div>
          </nav>
          <div className="sidebar-foot">
            <div className="account-chip">
              <div className="account-avatar" />
              <span>kleeeeee@gmail.com</span>
            </div>
          </div>
        </aside>

        <section className="content">
          <div className="workspace">
        {activeSection === "leaderboard" ? (
          <Leaderboard
            activeView={activeView}
            locale={locale}
            query={query}
            setActiveView={setActiveView}
            setQuery={setQuery}
          />
        ) : (
          activeSection === "pairwise" ? <PairwiseRating locale={locale} /> : <Annotation locale={locale} />
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
