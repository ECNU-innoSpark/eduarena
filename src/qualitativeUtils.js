export function parseNumber(value) {
  if (!value) return null;
  const cleaned = value.replace(/\?/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((item) => item.trim() !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((item) => item.trim() !== "")) rows.push(row);
  }

  return rows;
}

export function formatScore(value, digits = 2) {
  return value == null ? "--" : value.toFixed(digits).replace(/\.00$/, "");
}

export function clampRating(value) {
  if (value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.max(0, Math.min(5, num));
}

export function sliderValue(value) {
  return value === "" ? 0 : Number(value);
}

export function fileBaseName(fileName) {
  return (fileName || "").replace(/\.json$/i, "");
}

export function normalizeQualitativeRecord(source, fileName = "") {
  const messages = Array.isArray(source?.messages) ? source.messages : [];
  const firstUserMessage = messages.find((message) => message?.role === "user")?.content ?? "";

  return {
    ...source,
    record_id: source?.record_id ?? (fileBaseName(fileName) || "qualitative-record"),
    scenario: source?.scenario ?? source?.subject ?? source?.metadata?.scenario_name ?? source?.teacher_agent ?? "未提供",
    question:
      source?.question
      ?? source?.student_agent?.profile_summary?.original_question
      ?? firstUserMessage
      ?? source?.name
      ?? "未提供",
    intent: source?.intent ?? source?.question_type ?? source?.dialogue_mode ?? "未提供",
    difficulty:
      source?.difficulty
      ?? source?.student_agent?.profile_summary?.grade_or_age
      ?? source?.profile?.grade_level
      ?? "未提供",
    turn_count: source?.turn_count ?? messages.length ?? 0,
    messages,
  };
}

export function createEmptyRatings() {
  return {
    overview: {
      overall: "",
      pedagogy: "",
      accuracy: "",
      engagement: "",
      note: "",
    },
  };
}

export function normalizeRatings(record, savedData) {
  const empty = createEmptyRatings();
  const savedRecord = savedData?.records?.[record?.record_id];
  if (!savedRecord) return empty;

  return {
    overview: {
      ...empty.overview,
      ...(savedRecord.overview ?? {}),
    },
  };
}

export function runExamples() {
  const csvText = 'name,score\nalpha,4.5\n"beta,plus",5';
  const recordSource = {
    subject: "数学",
    question_type: "引导式讲题",
    messages: [
      { role: "user", content: "为什么要先算总数？" },
      { role: "assistant", content: "我们先看题目条件。" },
    ],
  };
  const savedData = {
    records: {
      task01: {
        overview: {
          overall: 4.5,
          note: "讲解清晰",
        },
      },
    },
  };

  console.log("parseNumber:", parseNumber(" 4.5? "));
  console.log("parseCsv:", JSON.stringify(parseCsv(csvText)));
  console.log("formatScore:", formatScore(4.5, 1));
  console.log("clampRating:", clampRating("7"));
  console.log("sliderValue:", sliderValue(""));
  console.log("fileBaseName:", fileBaseName("task01.json"));

  const normalizedRecord = normalizeQualitativeRecord(recordSource, "task01.json");
  console.log("normalizeQualitativeRecord:", JSON.stringify(normalizedRecord, null, 2));
  console.log("createEmptyRatings:", JSON.stringify(createEmptyRatings(), null, 2));
  console.log("normalizeRatings:", JSON.stringify(normalizeRatings(normalizedRecord, savedData), null, 2));
}
