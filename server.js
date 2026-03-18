import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ratingsFile = path.resolve(__dirname, "data/qualitative/message_ratings.json");
const ratingsDir = path.resolve(__dirname, "data/qualitative/message_ratings");
const messagesDir = path.resolve(__dirname, "data/qualitative/messages");

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

function pickNewerRecord(currentRecord, nextRecord) {
  if (!currentRecord) return nextRecord;

  const currentTime = Date.parse(currentRecord.updatedAt ?? "") || 0;
  const nextTime = Date.parse(nextRecord.updatedAt ?? "") || 0;

  return nextTime >= currentTime ? nextRecord : currentRecord;
}

async function readRatingsSnapshots() {
  try {
    await ensureRatingsDir();
    const names = await readdir(ratingsDir);
    const jsonNames = names.filter((name) => name.endsWith(".json")).sort();
    const snapshots = await Promise.all(
      jsonNames.map(async (name) => {
        const filePath = path.join(ratingsDir, name);
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
  try {
    const names = (await readdir(messagesDir))
      .filter((name) => name.endsWith(".json"))
      .sort();

    const items = await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(messagesDir, name);
        const content = await readFile(filePath, "utf8");
        const data = JSON.parse(content);
        const fallbackQuestion = data.messages?.find((message) => message?.role === "user")?.content ?? "";
        return {
          fileName: name,
          recordId: data.record_id ?? name.replace(/\.json$/i, ""),
          label: data.question ?? data.name ?? (fallbackQuestion.slice(0, 80) || name),
          scenario: data.scenario ?? data.subject ?? data.metadata?.scenario_name ?? data.teacher_agent ?? "",
          turnCount: data.turn_count ?? data.messages?.length ?? 0,
        };
      }),
    );

    return items;
  } catch {
    return [];
  }
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

function buildFolderSummary(snapshots) {
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
    dir: ratingsDir,
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
      const snapshotPath = path.join(ratingsDir, createSnapshotFileName(nextFile.savedAt));
      console.log("[ratings:post]", {
        dir: ratingsDir,
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
      });
      await ensureRatingsDir();
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

  if (req.method === "GET") {
    const snapshots = await readRatingsSnapshots();
    const summary = buildFolderSummary(snapshots);
    console.log("[ratings:folder:get]", summary);
    res.end(JSON.stringify(summary));
    return true;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
  return true;
}

async function handleMessageOptionsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET") {
    const items = await readMessageOptions();
    console.log("[messages:list:get]", {
      dir: messagesDir,
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
