#!/usr/bin/env python3

import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
RATINGS_FILE = ROOT / "data/qualitative/message_ratings.json"
RATINGS_DIR = ROOT / "data/qualitative/message_ratings"
PAIRWISE_RATINGS_DIR = ROOT / "data/qualitative/message_pariwise_ratings"
LEGACY_MESSAGES_DIR = ROOT / "data/qualitative/messages"
MESSAGES_V2_DIR = ROOT / "data/qualitative/messages_v2"
MESSAGES_V3_DIR = ROOT / "data/qualitative/messages_v3"
PAIRWISE_WINNERS = {"a", "b", "tie", "both_bad"}


def trim_text(value):
    return value.strip() if isinstance(value, str) else ""


def extract_message_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("type") == "text":
                parts.append(trim_text(part.get("text")))
        return "\n\n".join(part for part in parts if part)
    return ""


def get_messages(source):
    messages = source.get("messages") if isinstance(source, dict) else None
    return messages if isinstance(messages, list) else []


def get_first_user_message(source):
    for message in get_messages(source):
        if isinstance(message, dict) and message.get("role") == "user":
            return message.get("content", "")
    return ""


def build_message_option(source, file_name):
    first_user_message = extract_message_text(get_first_user_message(source))
    messages = get_messages(source)

    return {
        "fileName": file_name,
        "recordId": (
            source.get("record_id")
            or source.get("runId")
            or source.get("run_id")
            or source.get("sessionId")
            or source.get("teacherSessionId")
            or Path(file_name).stem
        ),
        "label": (
            source.get("question")
            or source.get("title")
            or source.get("name")
            or source.get("initialPrompt")
            or source.get("studentInitialQuestion")
            or first_user_message[:80]
            or file_name
        ),
        "scenario": (
            source.get("scenario")
            or source.get("subject")
            or source.get("metadata", {}).get("scenario_name")
            or source.get("metadata", {}).get("scene")
            or source.get("teacher_agent")
            or source.get("teacherAgent")
            or source.get("sceneName")
            or ""
        ),
        "turnCount": len(messages) if messages else source.get("turn_count") or source.get("followUpCount") or 0,
    }


def list_files_recursive(root_dir):
    if not root_dir.exists():
        return []
    return [path for path in root_dir.rglob("*") if path.is_file() and ".git" not in path.parts]


def is_inside_dir(root_dir, target_path):
    try:
        target_path.resolve().relative_to(root_dir.resolve())
        return True
    except ValueError:
        return False


def resolve_message_file(file_name):
    normalized = str(file_name or "").replace("\\", "/").lstrip("/")
    if not normalized:
        return None

    if normalized.startswith("v1/"):
        file_path = (LEGACY_MESSAGES_DIR / normalized[3:]).resolve()
        return file_path if is_inside_dir(LEGACY_MESSAGES_DIR, file_path) else None

    if normalized.startswith("v2/"):
        file_path = (MESSAGES_V2_DIR / normalized[3:]).resolve()
        return file_path if is_inside_dir(MESSAGES_V2_DIR, file_path) else None

    if normalized.startswith("v3/"):
        file_path = (MESSAGES_V3_DIR / normalized[3:]).resolve()
        return file_path if is_inside_dir(MESSAGES_V3_DIR, file_path) else None

    v3_path = (MESSAGES_V3_DIR / normalized).resolve()
    if is_inside_dir(MESSAGES_V3_DIR, v3_path):
        return v3_path

    legacy_path = (LEGACY_MESSAGES_DIR / Path(normalized).name).resolve()
    if is_inside_dir(LEGACY_MESSAGES_DIR, legacy_path):
        return legacy_path

    return None


def read_json(file_path, fallback=None):
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def read_message_record(file_name):
    file_path = resolve_message_file(file_name)
    if not file_path or not file_path.exists():
        return None
    return read_json(file_path)


def summarize_records(records):
    keys = list((records or {}).keys())
    return {"count": len(keys), "keys": keys}


def read_ratings_file():
    return read_json(RATINGS_FILE, {"version": 1, "savedAt": None, "records": {}})


def ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)


def parse_time(value):
    if not isinstance(value, str):
        return 0
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0


def pick_newer_record(current_record, next_record):
    if not current_record:
        return next_record
    return next_record if parse_time(next_record.get("updatedAt")) >= parse_time(current_record.get("updatedAt")) else current_record


def read_ratings_snapshots(target_dir=RATINGS_DIR):
    if not target_dir.exists():
        return []

    snapshots = []
    for file_path in sorted(target_dir.glob("*.json")):
        data = read_json(file_path)
        if data is not None:
            snapshots.append({"name": file_path.name, "filePath": str(file_path), "data": data})
    return snapshots


def read_message_options():
    items = []

    if MESSAGES_V3_DIR.exists():
        file_paths = sorted(
            (path for path in list_files_recursive(MESSAGES_V3_DIR) if path.name == "run.json"),
            key=lambda path: str(path),
        )
        for file_path in file_paths:
            data = read_json(file_path)
            if not isinstance(data, dict):
                continue
            conversation_path = file_path.parent / "conversation-messages.json"
            relative_path = conversation_path.relative_to(MESSAGES_V3_DIR).as_posix()
            items.append(build_message_option(data, relative_path))

    return sorted(items, key=lambda item: (str(item.get("scenario", "")), str(item.get("label", ""))))


def read_aggregated_ratings():
    legacy_data = read_ratings_file()
    snapshots = read_ratings_snapshots()
    aggregated = {
        "version": legacy_data.get("version", 1),
        "savedAt": legacy_data.get("savedAt"),
        "records": dict(legacy_data.get("records", {})),
    }

    for snapshot in snapshots:
        data = snapshot.get("data", {})
        aggregated["version"] = data.get("version", aggregated["version"])
        aggregated["savedAt"] = data.get("savedAt", aggregated["savedAt"])
        for record_id, record in data.get("records", {}).items():
            aggregated["records"][record_id] = pick_newer_record(aggregated["records"].get(record_id), record)

    return aggregated


def create_snapshot_file_name(saved_at):
    safe_timestamp = (saved_at or datetime.utcnow().isoformat()).replace(":", "-").replace(".", "-")
    return f"{safe_timestamp}.json"


def extract_latest_records(records):
    entries = list((records or {}).items())
    if not entries:
        return {}

    latest_time = max(parse_time(record.get("updatedAt")) for _, record in entries)
    return {
        record_id: record
        for record_id, record in entries
        if parse_time(record.get("updatedAt")) == latest_time
    }


def build_folder_summary(snapshots, target_dir=RATINGS_DIR):
    score_values = []
    for snapshot in snapshots:
        for record in snapshot.get("data", {}).get("records", {}).values():
            try:
                value = float(record.get("overview", {}).get("overall"))
            except (TypeError, ValueError):
                value = None
            if value is not None:
                score_values.append(value)

    average_overall = sum(score_values) / len(score_values) if score_values else None
    return {
        "dir": str(target_dir),
        "fileCount": len(snapshots),
        "files": [
            {
                "name": snapshot["name"],
                "savedAt": snapshot.get("data", {}).get("savedAt"),
                "recordCount": len(snapshot.get("data", {}).get("records", {})),
            }
            for snapshot in snapshots
        ],
        "averageOverall": average_overall,
    }


def is_non_empty_string(value):
    return isinstance(value, str) and value.strip() != ""


def is_iso_date_string(value):
    return parse_time(value) > 0


def is_valid_pairwise_record(record):
    if not isinstance(record, dict):
        return False
    if not is_non_empty_string(record.get("record_id")):
        return False
    if not is_non_empty_string(record.get("scenario")):
        return False
    if not is_non_empty_string(record.get("question")):
        return False
    try:
        float(record.get("turn_count"))
    except (TypeError, ValueError):
        return False
    if not is_iso_date_string(record.get("updatedAt")):
        return False

    pairwise = record.get("pairwise")
    if not isinstance(pairwise, dict) or pairwise.get("winner") not in PAIRWISE_WINNERS:
        return False

    pairwise_meta = record.get("pairwise_meta")
    if not isinstance(pairwise_meta, dict):
        return False
    if not is_non_empty_string(pairwise_meta.get("candidate_a_file")):
        return False
    if not is_non_empty_string(pairwise_meta.get("candidate_b_file")):
        return False
    return True


def has_pairwise_ratings(records):
    return any(is_valid_pairwise_record(record) for record in (records or {}).values())


class ApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        return json.loads(body.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/qualitative-messages":
            self.handle_qualitative_messages(parsed)
            return
        if parsed.path == "/api/qualitative-ratings-folder":
            self.handle_ratings_folder(parsed)
            return
        if parsed.path == "/api/qualitative-ratings":
            self._send_json(read_aggregated_ratings())
            return

        self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/qualitative-ratings":
            self._send_json({"error": "Not Found"}, status=404)
            return

        try:
            payload = self._read_json_body()
            current_file = read_aggregated_ratings()
            next_file = {
                "version": payload.get("version", current_file.get("version", 1)),
                "savedAt": payload.get("savedAt") or datetime.utcnow().isoformat(),
                "records": {
                    **current_file.get("records", {}),
                    **payload.get("records", {}),
                },
            }
            snapshot_data = {
                "version": next_file["version"],
                "savedAt": next_file["savedAt"],
                "records": extract_latest_records(payload.get("records", {})),
            }
            target_dir = PAIRWISE_RATINGS_DIR if has_pairwise_ratings(snapshot_data["records"]) else RATINGS_DIR
            ensure_dir(target_dir)
            snapshot_path = target_dir / create_snapshot_file_name(next_file["savedAt"])
            snapshot_path.write_text(json.dumps(snapshot_data, ensure_ascii=False, indent=2), encoding="utf-8")
            self._send_json(next_file)
        except Exception:
            self._send_json({"error": "Invalid ratings payload"}, status=400)

    def handle_qualitative_messages(self, parsed):
        query = parse_qs(parsed.query)
        file_name = query.get("file", [None])[0]
        if file_name:
            record = read_message_record(file_name)
            if record is None:
                self._send_json({"error": "Message record not found"}, status=404)
                return
            self._send_json(record)
            return

        self._send_json(read_message_options())

    def handle_ratings_folder(self, parsed):
        query = parse_qs(parsed.query)
        kind = query.get("kind", [None])[0]
        target_dir = PAIRWISE_RATINGS_DIR if kind == "pairwise" else RATINGS_DIR
        snapshots = read_ratings_snapshots(target_dir)
        self._send_json(build_folder_summary(snapshots, target_dir))

    def log_message(self, format, *args):
        return


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("API_PORT") or os.environ.get("PORT") or "5174")
    server = ThreadingHTTPServer((host, port), ApiHandler)
    print(f"API: http://{host}:{port}/api/qualitative-ratings")
    server.serve_forever()


if __name__ == "__main__":
    main()
