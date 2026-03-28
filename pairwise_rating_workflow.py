#!/usr/bin/env python3

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


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
    metadata = source.get("metadata", {}) if isinstance(source, dict) else {}

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
            or metadata.get("scenario_name")
            or metadata.get("scene")
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


def read_json(file_path, fallback=None):
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def summarize_records(records):
    keys = list((records or {}).keys())
    return {"count": len(keys), "keys": keys}


def get_message_question_folder(file_name):
    parts = [part for part in str(file_name or "").split("/") if part]
    return "/".join(parts[:-2]) if len(parts) > 2 else ""


def get_message_variant(file_name):
    parts = [part for part in str(file_name or "").split("/") if part]
    return "/".join(parts[-2:]) if len(parts) > 1 else str(file_name or "")


def get_message_variant_label(file_name):
    parts = [part for part in str(file_name or "").split("/") if part]
    return parts[-2] if len(parts) > 1 else str(file_name or "")


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


def is_non_empty_string(value):
    return isinstance(value, str) and value.strip() != ""


def is_iso_date_string(value):
    return parse_time(value) > 0


def normalize_record_user_email(record):
    if not isinstance(record, dict):
        return record

    normalized_record = dict(record)
    user_email = trim_text(record.get("user_email")).lower()
    if user_email:
        normalized_record["user_email"] = user_email
    else:
        normalized_record.pop("user_email", None)
    return normalized_record


@dataclass(frozen=True)
class PairwiseWorkflowPaths:
    root: Path
    ratings_file: Path
    ratings_dir: Path
    pairwise_ratings_dir: Path
    legacy_messages_dir: Path
    messages_v2_dir: Path
    messages_v3_dir: Path
    messages_v4_dir: Path


class PairwiseRatingWorkflow:
    PAIRWISE_WINNERS = {"a", "b", "tie", "both_bad"}

    def __init__(self, paths):
        self.paths = paths

    def resolve_message_file(self, file_name, folder_name=None):
        normalized = str(file_name or "").replace("\\", "/").lstrip("/")
        normalized_folder = str(folder_name or "").replace("\\", "/").strip("/")
        if not normalized:
            return None

        if normalized_folder:
            folder_path = self.resolve_message_folder(normalized_folder)
            if folder_path is not None:
                file_path = (folder_path / normalized).resolve()
                if is_inside_dir(folder_path, file_path):
                    return file_path

        if normalized.startswith("v1/"):
            file_path = (self.paths.legacy_messages_dir / normalized[3:]).resolve()
            return file_path if is_inside_dir(self.paths.legacy_messages_dir, file_path) else None

        if normalized.startswith("v2/"):
            file_path = (self.paths.messages_v2_dir / normalized[3:]).resolve()
            return file_path if is_inside_dir(self.paths.messages_v2_dir, file_path) else None

        if normalized.startswith("v3/"):
            file_path = (self.paths.messages_v3_dir / normalized[3:]).resolve()
            return file_path if is_inside_dir(self.paths.messages_v3_dir, file_path) else None

        if normalized.startswith("v4/"):
            file_path = (self.paths.messages_v4_dir / normalized[3:]).resolve()
            return file_path if is_inside_dir(self.paths.messages_v4_dir, file_path) else None

        v4_path = (self.paths.messages_v4_dir / normalized).resolve()
        if is_inside_dir(self.paths.messages_v4_dir, v4_path):
            return v4_path

        v3_path = (self.paths.messages_v3_dir / normalized).resolve()
        if is_inside_dir(self.paths.messages_v3_dir, v3_path):
            return v3_path

        legacy_path = (self.paths.legacy_messages_dir / Path(normalized).name).resolve()
        if is_inside_dir(self.paths.legacy_messages_dir, legacy_path):
            return legacy_path

        return None

    def resolve_message_folder(self, folder_name):
        normalized = str(folder_name or "").replace("\\", "/").strip("/")
        if not normalized:
            return None

        if normalized.startswith("v1/"):
            folder_path = (self.paths.legacy_messages_dir / normalized[3:]).resolve()
            return folder_path if is_inside_dir(self.paths.legacy_messages_dir, folder_path) else None

        if normalized.startswith("v2/"):
            folder_path = (self.paths.messages_v2_dir / normalized[3:]).resolve()
            return folder_path if is_inside_dir(self.paths.messages_v2_dir, folder_path) else None

        if normalized.startswith("v3/"):
            folder_path = (self.paths.messages_v3_dir / normalized[3:]).resolve()
            return folder_path if is_inside_dir(self.paths.messages_v3_dir, folder_path) else None

        if normalized.startswith("v4/"):
            folder_path = (self.paths.messages_v4_dir / normalized[3:]).resolve()
            return folder_path if is_inside_dir(self.paths.messages_v4_dir, folder_path) else None

        v4_path = (self.paths.messages_v4_dir / normalized).resolve()
        if is_inside_dir(self.paths.messages_v4_dir, v4_path):
            return v4_path

        v3_path = (self.paths.messages_v3_dir / normalized).resolve()
        if is_inside_dir(self.paths.messages_v3_dir, v3_path):
            return v3_path

        v2_path = (self.paths.messages_v2_dir / normalized).resolve()
        if is_inside_dir(self.paths.messages_v2_dir, v2_path):
            return v2_path

        return None

    def read_message_record(self, file_name, folder_name=None):
        file_path = self.resolve_message_file(file_name, folder_name=folder_name)
        if not file_path or not file_path.exists():
            return None
        return read_json(file_path)

    def read_ratings_file(self):
        return read_json(self.paths.ratings_file, {"version": 1, "savedAt": None, "records": {}})

    def read_ratings_snapshots(self, target_dir=None):
        snapshot_dir = target_dir or self.paths.ratings_dir
        if not snapshot_dir.exists():
            return []

        snapshots = []
        for file_path in sorted(snapshot_dir.glob("*.json")):
            data = read_json(file_path)
            if data is not None:
                snapshots.append({"name": file_path.name, "filePath": str(file_path), "data": data})
        return snapshots

    def read_message_options(self, multi_model_only=False, target_folder=None):
        items = []
        normalized_target_folder = str(target_folder or "").replace("\\", "/").strip("/")
        if self.paths.messages_v4_dir.exists():
            file_paths = sorted(
                (path for path in list_files_recursive(self.paths.messages_v4_dir) if path.name == "run.json"),
                key=lambda path: str(path),
            )
            for file_path in file_paths:
                conversation_path = file_path.parent / "conversation-messages.json"
                relative_path = conversation_path.relative_to(self.paths.messages_v4_dir).as_posix()
                if normalized_target_folder and get_message_question_folder(relative_path) != normalized_target_folder:
                    continue
                data = read_json(file_path)
                if not isinstance(data, dict):
                    continue
                items.append(build_message_option(data, relative_path))

        if multi_model_only:
            folder_counts = {}
            for item in items:
                folder_name = get_message_question_folder(item.get("fileName"))
                folder_counts[folder_name] = folder_counts.get(folder_name, 0) + 1
            items = [item for item in items if folder_counts.get(get_message_question_folder(item.get("fileName")), 0) > 1]

        return sorted(items, key=lambda item: (str(item.get("scenario", "")), str(item.get("label", ""))))

    def read_sibling_message_options(self, file_name):
        target_folder = get_message_question_folder(file_name)
        if not target_folder:
            return []

        sibling_items = self.read_message_options(multi_model_only=True, target_folder=target_folder)
        current_variant_file = get_message_variant(file_name)

        variant_map = {}
        for item in sibling_items:
            variant_file = get_message_variant(item.get("fileName"))
            if variant_file == current_variant_file:
                continue
            if variant_file in variant_map:
                continue
            variant_map[variant_file] = {
                "fileName": variant_file,
                "label": get_message_variant_label(item.get("fileName")),
                "scenario": item.get("scenario"),
                "recordId": item.get("recordId"),
            }

        return sorted(variant_map.values(), key=lambda item: str(item.get("label", "")).casefold())

    def read_aggregated_ratings(self):
        legacy_data = self.read_ratings_file()
        snapshots = self.read_ratings_snapshots()
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

    def build_folder_summary(self, target_dir=None):
        snapshot_dir = target_dir or self.paths.ratings_dir
        snapshots = self.read_ratings_snapshots(snapshot_dir)
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
            "dir": str(snapshot_dir),
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

    def is_valid_pairwise_record(self, record):
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
        if not isinstance(pairwise, dict) or pairwise.get("winner") not in self.PAIRWISE_WINNERS:
            return False

        pairwise_meta = record.get("pairwise_meta")
        if not isinstance(pairwise_meta, dict):
            return False
        if not is_non_empty_string(pairwise_meta.get("candidate_a_file")):
            return False
        if not is_non_empty_string(pairwise_meta.get("candidate_b_file")):
            return False
        return True

    def has_pairwise_ratings(self, records):
        return any(self.is_valid_pairwise_record(record) for record in (records or {}).values())

    def save_ratings_payload(self, payload):
        current_file = self.read_aggregated_ratings()
        payload_records = {
            record_id: normalize_record_user_email(record)
            for record_id, record in payload.get("records", {}).items()
        }
        next_file = {
            "version": payload.get("version", current_file.get("version", 1)),
            "savedAt": payload.get("savedAt") or datetime.utcnow().isoformat(),
            "records": {
                **current_file.get("records", {}),
                **payload_records,
            },
        }
        snapshot_data = {
            "version": next_file["version"],
            "savedAt": next_file["savedAt"],
            "records": extract_latest_records(payload_records),
        }
        target_dir = self.paths.pairwise_ratings_dir if self.has_pairwise_ratings(snapshot_data["records"]) else self.paths.ratings_dir
        ensure_dir(target_dir)
        snapshot_path = target_dir / create_snapshot_file_name(next_file["savedAt"])
        snapshot_path.write_text(json.dumps(snapshot_data, ensure_ascii=False, indent=2), encoding="utf-8")
        return {
            "nextFile": next_file,
            "snapshotData": snapshot_data,
            "snapshotPath": snapshot_path,
            "targetDir": target_dir,
        }


def create_default_workflow(root=None):
    base_root = (root or Path(__file__).resolve().parent).resolve()
    paths = PairwiseWorkflowPaths(
        root=base_root,
        ratings_file=base_root / "data/qualitative/message_ratings.json",
        ratings_dir=base_root / "data/qualitative/message_ratings",
        pairwise_ratings_dir=base_root / "data/qualitative/message_pariwise_ratings",
        legacy_messages_dir=base_root / "data/qualitative/messages",
        messages_v2_dir=base_root / "data/qualitative/messages_v2",
        messages_v3_dir=base_root / "data/qualitative/messages_v3",
        messages_v4_dir=base_root / "data/qualitative/new_message_data",
    )
    return PairwiseRatingWorkflow(paths)


def main():
    workflow = create_default_workflow()
    payload = {
        "messageOptions": workflow.read_message_options()[:2],
        "ratingsSummary": summarize_records(workflow.read_aggregated_ratings().get("records", {})),
        "pairwiseFolderSummary": workflow.build_folder_summary(workflow.paths.pairwise_ratings_dir),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
