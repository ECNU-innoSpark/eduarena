import React from "react";
import { formatScore } from "./qualitativeUtils";

export const QUALITY_METRICS = [
  { key: "knowledge", label: "知识点讲解", max: 5 },
  { key: "guided", label: "引导式讲题", max: 5 },
  { key: "crossDiscipline", label: "跨学科教案", max: 5 },
  { key: "scenario", label: "情景化出题", max: 5 },
  { key: "qualityAvg", label: "教学平均分", max: 5 },
];

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

export const VIEW_OPTIONS = [
  { key: "overall", label: "综合视图" },
  { key: "qualityAvg", label: "教学平均分" },
  { key: "benchmarkAvg", label: "综合基准分" },
  ...QUALITY_METRICS.filter((item) => item.key !== "qualityAvg"),
  ...BENCHMARK_METRICS.filter((item) => item.key !== "benchmarkAvg"),
];

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

export function scoreMax(key) {
  if (key === "overall") return 100;
  const all = [...QUALITY_METRICS, ...BENCHMARK_METRICS];
  return all.find((item) => item.key === key)?.max ?? 100;
}

export function labelFor(key) {
  if (key === "overall") return "综合得分";
  return VIEW_OPTIONS.find((item) => item.key === key)?.label ?? key;
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
