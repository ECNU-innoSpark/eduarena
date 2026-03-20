import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ANNOTATION_CSS, Annotation } from "./Annotation";
import {
  LEADERBOARD_CSS,
  Leaderboard,
  labelFor,
} from "./Leaderboard";

const APP_COPY = {
  zh: {
    sections: [
      { key: "qualitative", label: "质性评审", note: "对话 messages 与人工评分" },
      { key: "leaderboard", label: "榜单", note: "教学能力与通用基准双轴榜单" },
    ],
    sidebarCopy: "教学榜单与质性评审工作台。左侧切换 workspace，右侧查看当前内容。",
    currentView: "当前视图",
    modelRanking: "模型排行",
    messageReview: "消息评审",
    annotationDesk: "单条对话评分工作台",
    langLabel: "语言",
    langZh: "中文",
    langEn: "English",
  },
  en: {
    sections: [
      { key: "qualitative", label: "Qualitative Review", note: "Conversation messages and human ratings" },
      { key: "leaderboard", label: "Leaderboard", note: "Teaching ability and benchmark ranking" },
    ],
    sidebarCopy: "A workspace for teaching leaderboards and qualitative review. Switch workspaces on the left and inspect content on the right.",
    currentView: "Current View",
    modelRanking: "Model Ranking",
    messageReview: "Message Review",
    annotationDesk: "Single-conversation rating workspace",
    langLabel: "Language",
    langZh: "中文",
    langEn: "English",
  },
};

const APP_SHELL_CSS = `
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

  .language-switcher {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
  }

  .language-row {
    display: flex;
    gap: 8px;
  }

  .language-btn {
    flex: 1 1 0;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    cursor: pointer;
    transition: 180ms ease;
  }

  .language-btn.active {
    background: var(--accent);
    border-color: transparent;
    color: white;
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

const css = `${APP_SHELL_CSS}\n${ANNOTATION_CSS}\n${LEADERBOARD_CSS}`;

function App() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("qualitative");
  const [activeView, setActiveView] = useState("overall");
  const [locale, setLocale] = useState("zh");
  const copy = APP_COPY[locale];
  const sections = copy.sections;

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
              {copy.sidebarCopy}
            </p>
          </div>
          <nav className="sidebar-nav">
            <div className="language-switcher">
              <div className="sidebar-label">{copy.langLabel}</div>
              <div className="language-row">
                <button
                  className={`language-btn ${locale === "zh" ? "active" : ""}`}
                  onClick={() => setLocale("zh")}
                  type="button"
                >
                  {copy.langZh}
                </button>
                <button
                  className={`language-btn ${locale === "en" ? "active" : ""}`}
                  onClick={() => setLocale("en")}
                  type="button"
                >
                  {copy.langEn}
                </button>
              </div>
            </div>
            <div className="mode-switcher">
              {sections.map((section) => (
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
              <div className="sidebar-label">{copy.currentView}</div>
              <button className="mode-tab" type="button">
                <strong>{activeSection === "leaderboard" ? copy.modelRanking : copy.messageReview}</strong>
                <span>{activeSection === "leaderboard" ? labelFor(activeView, locale) : copy.annotationDesk}</span>
              </button>
            </div>
          </nav>
          <div className="sidebar-foot">eduarean · by inno-spark</div>
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
          <Annotation locale={locale} />
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
