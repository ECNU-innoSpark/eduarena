import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ratingsFile = path.resolve(__dirname, "data/qualitative/message_ratings.json");
const ratingsDir = path.resolve(__dirname, "data/qualitative/message_ratings");
const pairwiseRatingsDir = path.resolve(__dirname, "data/qualitative/message_pariwise_ratings");
const legacyMessagesDir = path.resolve(__dirname, "data/qualitative/messages");
const messagesV2Dir = path.resolve(__dirname, "data/qualitative/messages_v2");
const messagesV3Dir = path.resolve(__dirname, "data/qualitative/messages_v3");

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractMessageText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return trimText(part.text);
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function getMessages(source) {
  return Array.isArray(source?.messages) ? source.messages : [];
}

function getFirstUserMessage(source) {
  return (
    getMessages(source)
      .find((message) => message?.role === "user")
      ?.content ?? ""
  );
}

function buildMessageOption(source, fileName) {
  const firstUserMessage = extractMessageText(getFirstUserMessage(source));
  const messages = getMessages(source);

  return {
    fileName,
    recordId:
      source?.record_id
      ?? source?.runId
      ?? source?.run_id
      ?? source?.sessionId
      ?? source?.teacherSessionId
      ?? path.basename(fileName, path.extname(fileName)),
    label:
      source?.question
      ?? source?.title
      ?? source?.name
      ?? source?.initialPrompt
      ?? source?.studentInitialQuestion
      ?? (firstUserMessage.slice(0, 80) || fileName),
    scenario:
      source?.scenario
      ?? source?.subject
      ?? source?.metadata?.scenario_name
      ?? source?.metadata?.scene
      ?? source?.teacher_agent
      ?? source?.teacherAgent
      ?? source?.sceneName
      ?? "",
    turnCount:
      (messages.length > 0 ? messages.length : null)
      ?? source?.turn_count
      ?? source?.followUpCount
      ?? 0,
  };
}

async function listFilesRecursive(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory() && entry.name === ".git") {
        return [];
      }
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath);
      }
      return [entryPath];
    }),
  );
  return files.flat();
}

function isInsideDir(rootDir, targetPath) {
  const relative = path.relative(rootDir, targetPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveMessageFile(fileName) {
  const normalized = String(fileName ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("v1/")) {
    const filePath = path.resolve(legacyMessagesDir, normalized.slice(3));
    return isInsideDir(legacyMessagesDir, filePath) ? filePath : null;
  }

  if (normalized.startsWith("v2/")) {
    const filePath = path.resolve(messagesV2Dir, normalized.slice(3));
    return isInsideDir(messagesV2Dir, filePath) ? filePath : null;
  }

  if (normalized.startsWith("v3/")) {
    const filePath = path.resolve(messagesV3Dir, normalized.slice(3));
    return isInsideDir(messagesV3Dir, filePath) ? filePath : null;
  }

  const v3Path = path.resolve(messagesV3Dir, normalized);
  if (isInsideDir(messagesV3Dir, v3Path)) {
    return v3Path;
  }

  const legacyPath = path.resolve(legacyMessagesDir, path.basename(normalized));
  if (isInsideDir(legacyMessagesDir, legacyPath)) {
    return legacyPath;
  }

  return null;
}

async function readMessageRecord(fileName) {
  const filePath = resolveMessageFile(fileName);
  if (!filePath) return null;

  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

function summarizeRecords(records) {
  const keys = Object.keys(records ?? {});
  return {
    count: keys.length,
    keys,
  };
}

function getArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

async function readRatingsFile() {
  try {
    const content = await readFile(ratingsFile, "utf8");
    return JSON.parse(content);
  } catch {
    return { version: 1, savedAt: null, records: {} };
  }
}

async function ensureRatingsDir() {
  await mkdir(ratingsDir, { recursive: true });
}

async function ensurePairwiseRatingsDir() {
  await mkdir(pairwiseRatingsDir, { recursive: true });
}

const PAIRWISE_WINNERS = new Set(["a", "b", "tie", "both_bad"]);
const PAIRWISE_CONFIDENCE = new Set(["high", "medium", "low", ""]);
const PAIRWISE_DIMENSION_CHOICES = new Set(["a", "b", "tie", ""]);
const PAIRWISE_DIMENSIONS = ["pedagogy", "accuracy", "clarity", "completeness"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateString(value) {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isValidPairwiseRecord(record) {
  console.log(record)
  if (!record || typeof record !== "object") return false;
  if (!isNonEmptyString(record.record_id)) return false;
  if (!isNonEmptyString(record.scenario)) return false;
  if (!isNonEmptyString(record.question)) return false;
  if (!Number.isFinite(Number(record.turn_count))) return false;
  if (!isIsoDateString(record.updatedAt)) return false;

  const pairwise = record.pairwise;
  if (!PAIRWISE_WINNERS.has(pairwise.winner)) return false;


  const pairwiseMeta = record.pairwise_meta;
  if (!pairwiseMeta || typeof pairwiseMeta !== "object") return false;
  if (!isNonEmptyString(pairwiseMeta.candidate_a_file)) return false;
  if (!isNonEmptyString(pairwiseMeta.candidate_b_file)) return false;

  return true;
}

function hasPairwiseRatings(records) {
  return Object.values(records ?? {}).some((record) => isValidPairwiseRecord(record));
}

function pickNewerRecord(currentRecord, nextRecord) {
  if (!currentRecord) return nextRecord;

  const currentTime = Date.parse(currentRecord.updatedAt ?? "") || 0;
  const nextTime = Date.parse(nextRecord.updatedAt ?? "") || 0;

  return nextTime >= currentTime ? nextRecord : currentRecord;
}

async function readRatingsSnapshots(targetDir = ratingsDir) {
  try {
    await mkdir(targetDir, { recursive: true });
    const names = await readdir(targetDir);
    const jsonNames = names.filter((name) => name.endsWith(".json")).sort();
    const snapshots = await Promise.all(
      jsonNames.map(async (name) => {
        const filePath = path.join(targetDir, name);
        const content = await readFile(filePath, "utf8");
        return {
          name,
          filePath,
          data: JSON.parse(content),
        };
      }),
    );
    return snapshots;
  } catch {
    return [];
  }
}

async function readMessageOptions() {
  const items = [];

  // try {
  //   const names = (await readdir(legacyMessagesDir))
  //     .filter((name) => name.endsWith(".json"))
  //     .sort();
  //
  //   const legacyItems = await Promise.all(
  //     names.map(async (name) => {
  //       const filePath = path.join(legacyMessagesDir, name);
  //       const content = await readFile(filePath, "utf8");
  //       const data = JSON.parse(content);
  //       return buildMessageOption(data, `v1/${name}`);
  //     }),
  //   );
  //   items.push(...legacyItems);
  // } catch {
  //   // Ignore missing legacy directory.
  // }
  //
  // try {
  //   const filePaths = (await listFilesRecursive(messagesV2Dir))
  //     .filter((filePath) => filePath.endsWith("conversation-messages.json"))
  //     .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
  //
  //   const v2Items = await Promise.all(
  //     filePaths.map(async (filePath) => {
  //       const content = await readFile(filePath, "utf8");
  //       const data = JSON.parse(content);
  //       const relativePath = toPosixPath(path.relative(messagesV2Dir, filePath));
  //       return buildMessageOption(data, `v2/${relativePath}`);
  //     }),
  //   );
  //   items.push(...v2Items);
  // } catch {
  //   // Ignore missing v2 directory.
  // }

  try {
    const filePaths = (await listFilesRecursive(messagesV3Dir))
      .filter((filePath) => filePath.endsWith("run.json"))
      .sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));

    const v3Items = await Promise.all(
      filePaths.map(async (filePath) => {
        const content = await readFile(filePath, "utf8");
        const data = JSON.parse(content);
        const conversationPath = path.join(path.dirname(filePath), "conversation-messages.json");
        const relativePath = toPosixPath(path.relative(messagesV3Dir, conversationPath));
        return buildMessageOption(data, relativePath);
      }),
    );
    items.push(...v3Items);
  } catch {
    // Ignore missing v3 directory.
  }

  return items.sort((left, right) => {
    const scenarioCompare = String(left.scenario ?? "").localeCompare(String(right.scenario ?? ""), "zh-Hans-CN");
    if (scenarioCompare !== 0) return scenarioCompare;
    return String(left.label ?? "").localeCompare(String(right.label ?? ""), "zh-Hans-CN");
  });
}

async function readAggregatedRatings() {
  const legacyData = await readRatingsFile();
  const snapshots = await readRatingsSnapshots();
  const aggregated = {
    version: legacyData.version ?? 1,
    savedAt: legacyData.savedAt ?? null,
    records: { ...(legacyData.records ?? {}) },
  };

  for (const snapshot of snapshots) {
    aggregated.version = snapshot.data.version ?? aggregated.version;
    aggregated.savedAt = snapshot.data.savedAt ?? aggregated.savedAt;

    for (const [recordId, record] of Object.entries(snapshot.data.records ?? {})) {
      aggregated.records[recordId] = pickNewerRecord(aggregated.records[recordId], record);
    }
  }

  return aggregated;
}

function createSnapshotFileName(savedAt) {
  const safeTimestamp = (savedAt ?? new Date().toISOString()).replace(/[:.]/g, "-");
  return `${safeTimestamp}.json`;
}

function extractLatestRecords(records) {
  const entries = Object.entries(records ?? {});
  if (!entries.length) return {};

  let latestTime = -1;
  for (const [, record] of entries) {
    const updatedTime = Date.parse(record?.updatedAt ?? "") || 0;
    latestTime = Math.max(latestTime, updatedTime);
  }

  return Object.fromEntries(
    entries.filter(([, record]) => (Date.parse(record?.updatedAt ?? "") || 0) === latestTime),
  );
}

function buildFolderSummary(snapshots, targetDir = ratingsDir) {
  const scoreValues = [];

  for (const snapshot of snapshots) {
    for (const record of Object.values(snapshot.data.records ?? {})) {
      const value = Number(record?.overview?.overall);
      if (Number.isFinite(value)) {
        scoreValues.push(value);
      }
    }
  }

  return {
    dir: targetDir,
    fileCount: snapshots.length,
    files: snapshots.map((snapshot) => ({
      name: snapshot.name,
      savedAt: snapshot.data.savedAt ?? null,
      recordCount: Object.keys(snapshot.data.records ?? {}).length,
    })),
    averageOverall: scoreValues.length
      ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
      : null,
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleRatingsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET") {
    const data = await readAggregatedRatings();
    const summary = summarizeRecords(data.records);
    console.log("[ratings:get]", {
      dir: ratingsDir,
      file: ratingsFile,
      count: summary.count,
      keys: summary.keys,
    });
    res.end(JSON.stringify(data));
    return true;
  }

  if (req.method === "POST") {
    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body);
      const currentFile = await readAggregatedRatings();
      const currentSummary = summarizeRecords(currentFile.records);
      const payloadSummary = summarizeRecords(payload.records);
      const overlappingKeys = payloadSummary.keys.filter((key) => currentSummary.keys.includes(key));
      const nextFile = {
        version: payload.version ?? currentFile.version ?? 1,
        savedAt: payload.savedAt ?? new Date().toISOString(),
        records: {
          ...(currentFile.records ?? {}),
          ...(payload.records ?? {}),
        },
      };
      const snapshotData = {
        version: nextFile.version,
        savedAt: nextFile.savedAt,
        records: extractLatestRecords(payload.records),
      };
      const nextSummary = summarizeRecords(nextFile.records);
      const targetDir = hasPairwiseRatings(snapshotData.records) ? pairwiseRatingsDir : ratingsDir;
      const snapshotPath = path.join(targetDir, createSnapshotFileName(nextFile.savedAt));
      console.log("[ratings:post]", {
        dir: targetDir,
        file: ratingsFile,
        snapshotPath,
        currentCount: currentSummary.count,
        payloadCount: payloadSummary.count,
        nextCount: nextSummary.count,
        snapshotRecordKeys: Object.keys(snapshotData.records),
        currentKeys: currentSummary.keys,
        payloadKeys: payloadSummary.keys,
        overlappingKeys,
        nextKeys: nextSummary.keys,
        containsPairwise: hasPairwiseRatings(snapshotData.records),
      });
      if (targetDir === pairwiseRatingsDir) {
        await ensurePairwiseRatingsDir();
      } else {
        await ensureRatingsDir();
      }
      await writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2));
      res.end(JSON.stringify(nextFile));
    } catch (error) {
      console.error("[ratings:error]", error);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid ratings payload" }));
    }
    return true;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
  return true;
}

async function handleRatingsFolderApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  const kind = requestUrl.searchParams.get("kind");

  if (req.method === "GET") {
    const targetDir = kind === "pairwise" ? pairwiseRatingsDir : ratingsDir;
    const snapshots = await readRatingsSnapshots(targetDir);
    const summary = buildFolderSummary(snapshots, targetDir);
    console.log("[ratings:folder:get]", { kind: kind ?? "default", ...summary });
    res.end(JSON.stringify(summary));
    return true;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
  return true;
}

async function handleMessageOptionsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  const fileName = requestUrl.searchParams.get("file");

  if (req.method === "GET") {
    if (fileName) {
      const record = await readMessageRecord(fileName);
      if (!record) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Message record not found" }));
        return true;
      }
      console.log("[messages:record:get]", { fileName });
      res.end(JSON.stringify(record));
      return true;
    }

    const items = await readMessageOptions();
    console.log("[messages:list:get]", {
      dirs: [legacyMessagesDir, messagesV2Dir, messagesV3Dir],
      count: items.length,
      files: items.map((item) => item.fileName),
    });
    res.end(JSON.stringify(items));
    return true;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
  return true;
}

async function start() {
  const host = getArg("--host", process.env.HOST || "127.0.0.1");
  const port = Number(getArg("--port", process.env.API_PORT || process.env.PORT || "5174"));

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url?.startsWith("/api/qualitative-messages")) {
        await handleMessageOptionsApi(req, res);
        return;
      }
      if (req.url?.startsWith("/api/qualitative-ratings-folder")) {
        await handleRatingsFolderApi(req, res);
        return;
      }
      if (req.url?.startsWith("/api/qualitative-ratings")) {
        await handleRatingsApi(req, res);
        return;
      }
      res.statusCode = 404;
      res.end("Not Found");
    } catch (error) {
      res.statusCode = 500;
      res.end(error.message);
    }
  });

  server.listen(port, host, () => {
    console.log(`API: http://${host}:${port}/api/qualitative-ratings`);
  });
}

start();
