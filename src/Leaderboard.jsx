import React, { useEffect, useMemo, useState } from "react";
import { formatScore, parseCsv, parseNumber } from "./qualitativeUtils";

export const LEADERBOARD_CSS = `
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

  @media (max-width: 920px) {
    .hero,
    .layout {
      grid-template-columns: 1fr;
    }

    .search {
      margin-left: 0;
    }
  }

  @media (max-width: 640px) {
    .bar-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .score-grid {
      grid-template-columns: 1fr;
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
  { key: "knowledge", label: "知识点讲解", max: 5 },
  { key: "guided", label: "引导式讲题", max: 5 },
  { key: "crossDiscipline", label: "跨学科教案", max: 5 },
  { key: "scenario", label: "情景化出题", max: 5 },
  { key: "qualityAvg", label: "教学平均分", max: 5 },
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
  { key: "mmluPro", label: "MMLU-Pro", max: 100 },
  { key: "math", label: "Math", max: 100 },
  { key: "ifeval", label: "IFEval", max: 100 },
  { key: "ceval", label: "CEval", max: 100 },
  { key: "humaneval", label: "HumanEval", max: 100 },
  { key: "lcbCode", label: "LCB Code", max: 100 },
  { key: "aime2024", label: "AIME 2024", max: 100 },
  { key: "simpleQa", label: "SimpleQA", max: 100 },
  { key: "chineseSimpleQa", label: "Chinese SimpleQA", max: 100 },
  { key: "benchmarkAvg", label: "综合基准分", max: 100 },
  { key: "instruction", label: "指令遵循", max: 100 },
  { key: "worldKnowledge", label: "世界知识", max: 100 },
  { key: "reasoning", label: "复杂推理", max: 100 },
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
  { key: "overall", label: "综合视图" },
  { key: "qualityAvg", label: "教学平均分" },
  { key: "benchmarkAvg", label: "综合基准分" },
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

// Python equivalent:
// def label_for(key):
//     if key == "overall":
//         return "综合得分"
//     return next((item["label"] for item in VIEW_OPTIONS if item["key"] == key), key)
export function labelFor(key) {
  if (key === "overall") return "综合得分";
  return VIEW_OPTIONS.find((item) => item.key === key)?.label ?? key;
}

export function useLeaderboardData({ activeView, query }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

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

function MetricItem({ label, value, max }) {
  const width = value == null ? 0 : Math.max(4, (value / max) * 100);
  return (
    <div className="metric-item">
      <header>
        <span>{label}</span>
        <span>{formatScore(value)}</span>
      </header>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(width, 100)}%` }} />
      </div>
    </div>
  );
}

export function Leaderboard({
  activeView,
  domesticCount,
  foreignCount,
  leader,
  models,
  query,
  ranked,
  selectedModel,
  setActiveView,
  setQuery,
  setSelectedModel,
}) {
  return (
    <>
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">llm leaderboard</span>
          <h1>教学能力与通用基准的双轴榜单</h1>
          <p>
            从本地 CSV 直接生成的 React 可视化，聚合教学维度打分与公开 benchmark，
            用最少文件提供一个可筛选、可切换维度、可查看单模型细节的榜单页面。
          </p>
        </div>
        <div className="panel stats">
          <div className="stat-card">
            <span>模型数量</span>
            <strong>{models.length || "--"}</strong>
          </div>
          <div className="stat-card">
            <span>当前榜首</span>
            <strong>{leader ? leader.name.split("-")[0] : "--"}</strong>
          </div>
          <div className="stat-card">
            <span>国内模型</span>
            <strong>{domesticCount}</strong>
          </div>
          <div className="stat-card">
            <span>国外模型</span>
            <strong>{foreignCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel controls">
        <div className="tabs">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`tab ${activeView === option.key ? "active" : ""}`}
              onClick={() => setActiveView(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模型名 / 备注 / 版本号"
          />
        </label>
      </section>

      <section className="layout">
        <article className="panel chart-panel">
          <div className="section-title">
            <h2>{labelFor(activeView)} 排行</h2>
            <span>按当前维度自动排序</span>
          </div>
          {ranked.length ? (
            <div className="bars">
              {ranked.map((model, index) => {
                const max = scoreMax(activeView);
                const width = Math.max(6, (model.activeScore / max) * 100);
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
                    <div className="bar-label">
                      <strong>
                        {index + 1}. {model.name}
                      </strong>
                      <span>{model.note || "未分类"}</span>
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
            <div className="empty">没有匹配结果。</div>
          )}
        </article>

        <aside className="panel detail-panel">
          {selectedModel ? (
            <>
              <div className="detail-header">
                <div>
                  <h3>{selectedModel.name}</h3>
                  <span className="pill">
                    {selectedModel.note || "未备注"}
                    {selectedModel.version ? ` · v${selectedModel.version}` : ""}
                  </span>
                </div>
                <div className="pill">
                  综合得分 {formatScore(scoreValue(selectedModel, "overall"))}
                </div>
              </div>

              <div className="score-grid">
                <div className="score-card">
                  <span>教学平均分</span>
                  <strong>{formatScore(selectedModel.qualityAvg)}</strong>
                </div>
                <div className="score-card">
                  <span>综合基准分</span>
                  <strong>{formatScore(selectedModel.benchmarkAvg)}</strong>
                </div>
              </div>

              <div className="section-title">
                <h3>教学维度</h3>
                <span>5 分制</span>
              </div>
              <div className="metric-list">
                {QUALITY_METRICS.map((metric) => (
                  <MetricItem
                    key={metric.key}
                    label={metric.label}
                    value={selectedModel[metric.key]}
                    max={metric.max}
                  />
                ))}
              </div>

              <div className="section-title" style={{ marginTop: 18 }}>
                <h3>Benchmark 维度</h3>
                <span>百分制</span>
              </div>
              <div className="metric-list">
                {BENCHMARK_METRICS.map((metric) => (
                  <MetricItem
                    key={metric.key}
                    label={metric.label}
                    value={selectedModel[metric.key]}
                    max={metric.max}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty">选择左侧模型以查看详细得分。</div>
          )}
        </aside>
      </section>
    </>
  );
}

export function LeaderboardWorkspace({
  activeView,
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
  );
}
