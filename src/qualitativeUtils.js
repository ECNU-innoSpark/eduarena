export function parseNumber(value) {
  // Python equivalent:
  // def parse_number(value):
  //     if not value:
  //         return None
  //     cleaned = re.sub(r"\?", "", str(value)).strip()
  //     if not cleaned:
  //         return None
  //     try:
  //         num = float(cleaned)
  //     except (TypeError, ValueError):
  //         return None
  //     return num if math.isfinite(num) else None
  if (!value) return null;
  const cleaned = value.replace(/\?/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseCsv(text) {
  // Python equivalent:
  // def parse_csv(text):
  //     rows = []
  //     current = ""
  //     row = []
  //     in_quotes = False
  //     i = 0
  //     while i < len(text):
  //         char = text[i]
  //         next_char = text[i + 1] if i + 1 < len(text) else None
  //         if char == '"':
  //             if in_quotes and next_char == '"':
  //                 current += '"'
  //                 i += 1
  //             else:
  //                 in_quotes = not in_quotes
  //         elif char == "," and not in_quotes:
  //             row.append(current)
  //             current = ""
  //         elif char in ("\n", "\r") and not in_quotes:
  //             if char == "\r" and next_char == "\n":
  //                 i += 1
  //             row.append(current)
  //             if any(item.strip() != "" for item in row):
  //                 rows.append(row)
  //             row = []
  //             current = ""
  //         else:
  //             current += char
  //         i += 1
  //     if current or row:
  //         row.append(current)
  //         if any(item.strip() != "" for item in row):
  //             rows.append(row)
  //     return rows
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
  // Python equivalent:
  // def format_score(value, digits=2):
  //     if value is None:
  //         return "--"
  //     formatted = f"{value:.{digits}f}"
  //     return re.sub(r"\.00$", "", formatted)
  return value == null ? "--" : value.toFixed(digits).replace(/\.00$/, "");
}

export function clampRating(value) {
  // Python equivalent:
  // def clamp_rating(value):
  //     if value == "":
  //         return ""
  //     try:
  //         num = float(value)
  //     except (TypeError, ValueError):
  //         return ""
  //     if not math.isfinite(num):
  //         return ""
  //     return max(0, min(5, num))
  if (value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.max(0, Math.min(5, num));
}

export function sliderValue(value) {
  // Python equivalent:
  // def slider_value(value):
  //     return 0 if value == "" else float(value)
  return value === "" ? 0 : Number(value);
}

export function fileBaseName(fileName) {
  // Python equivalent:
  // def file_base_name(file_name):
  //     return re.sub(r"\.json$", "", file_name or "", flags=re.IGNORECASE)
  return (fileName || "").replace(/\.json$/i, "");
}

export function normalizeQualitativeRecord(source, fileName = "") {
  // Python equivalent:
  // def normalize_qualitative_record(source, file_name=""):
  //     source = source or {}
  //     messages = source.get("messages") if isinstance(source.get("messages"), list) else []
  //     first_user_message = next((message.get("content", "") for message in messages if message.get("role") == "user"), "")
  //     return {
  //         **source,
  //         "record_id": source.get("record_id") or source.get("runId") or source.get("sessionId") or file_base_name(file_name) or "qualitative-record",
  //         "scenario": source.get("scenario") or source.get("subject") or _get_nested(source, "metadata", "scenario_name") or source.get("teacher_agent") or source.get("sceneName") or "未提供",
  //         "question": source.get("question") or source.get("title") or source.get("initialPrompt") or _get_nested(source, "student_agent", "profile_summary", "original_question") or first_user_message or source.get("name") or "未提供",
  //         "intent": source.get("intent") or source.get("question_type") or source.get("dialogue_mode") or "未提供",
  //         "difficulty": source.get("difficulty") or _get_nested(source, "student_agent", "profile_summary", "grade_or_age") or _get_nested(source, "profile", "grade_level") or "未提供",
  //         "turn_count": source.get("turn_count") or len(messages) or 0,
  //         "messages": messages,
  //     }
  const messages = Array.isArray(source?.messages) ? source.messages : [];
  const firstUserMessage = messages.find((message) => message?.role === "user")?.content ?? "";
  const messageCount = messages.length > 0 ? messages.length : null;

  return {
    ...source,
    record_id: source?.record_id ?? source?.runId ?? source?.sessionId ?? (fileBaseName(fileName) || "qualitative-record"),
    scenario:
      source?.scenario
      ?? source?.subject
      ?? source?.metadata?.scenario_name
      ?? source?.teacher_agent
      ?? source?.sceneName
      ?? "未提供",
    question:
      source?.question
      ?? source?.title
      ?? source?.initialPrompt
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
    turn_count: messageCount ?? source?.turn_count ?? 0,
    messages,
  };
}

export function createEmptyRatings() {
  // Python equivalent:
  // def create_empty_ratings():
  //     return {
  //         "overview": {
  //             "overall": "",
  //             "pedagogy": "",
  //             "accuracy": "",
  //             "engagement": "",
  //             "note": "",
  //         }
  //     }
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
  // Python equivalent:
  // def normalize_ratings(record, saved_data):
  //     empty = create_empty_ratings()
  //     record_id = (record or {}).get("record_id")
  //     saved_record = ((saved_data or {}).get("records") or {}).get(record_id)
  //     if not saved_record:
  //         return empty
  //     return {
  //         "overview": {
  //             **empty["overview"],
  //             **(saved_record.get("overview") or {}),
  //         }
  //     }
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
  // Python equivalent:
  // def run_examples():
  //     csv_text = 'name,score\nalpha,4.5\n"beta,plus",5'
  //     record_source = {
  //         "subject": "数学",
  //         "question_type": "引导式讲题",
  //         "messages": [
  //             {"role": "user", "content": "为什么要先算总数？"},
  //             {"role": "assistant", "content": "我们先看题目条件。"},
  //         ],
  //     }
  //     saved_data = {
  //         "records": {
  //             "task01": {
  //                 "overview": {
  //                     "overall": 4.5,
  //                     "note": "讲解清晰",
  //                 }
  //             }
  //         }
  //     }
  //     print("parse_number:", parse_number(" 4.5? "))
  //     print("parse_csv:", json.dumps(parse_csv(csv_text), ensure_ascii=False))
  //     print("format_score:", format_score(4.5, 1))
  //     print("clamp_rating:", clamp_rating("7"))
  //     print("slider_value:", slider_value(""))
  //     print("file_base_name:", file_base_name("task01.json"))
  //     normalized_record = normalize_qualitative_record(record_source, "task01.json")
  //     print("normalize_qualitative_record:", json.dumps(normalized_record, ensure_ascii=False, indent=2))
  //     print("create_empty_ratings:", json.dumps(create_empty_ratings(), ensure_ascii=False, indent=2))
  //     print("normalize_ratings:", json.dumps(normalize_ratings(normalized_record, saved_data), ensure_ascii=False, indent=2))
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
