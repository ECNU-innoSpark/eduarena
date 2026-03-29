from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qs, unquote, urlparse

from user_auth_store import AuthError


@dataclass(frozen=True)
class ApiResponse:
    status: int
    payload: Any = None
    file_path: Optional[Path] = None


def resolve_static_path(request_path, root_dir, dist_dir, data_dir):
    root_dir = Path(root_dir).resolve()
    dist_dir = Path(dist_dir).resolve()
    data_dir = Path(data_dir).resolve()
    decoded_path = unquote(request_path or "/")

    if decoded_path.startswith("/data/"):
        candidate = (root_dir / decoded_path.lstrip("/")).resolve()
        try:
            candidate.relative_to(data_dir)
        except ValueError:
            return None
        return candidate if candidate.is_file() else None

    relative_path = decoded_path.lstrip("/") or "index.html"
    candidate = (dist_dir / relative_path).resolve()
    try:
        candidate.relative_to(dist_dir)
    except ValueError:
        return None

    if candidate.is_file():
        return candidate

    if "." not in Path(relative_path).name:
        index_file = (dist_dir / "index.html").resolve()
        return index_file if index_file.is_file() else None

    return None


def _is_truthy_query_value(value):
    return str(value or "").strip().lower() in {"1", "true", "yes"}


def _handle_qualitative_messages(parsed, workflow):
    query = parse_qs(parsed.query)
    file_name = query.get("file", [None])[0]
    folder_name = query.get("folder", [None])[0]
    multi_model_only = _is_truthy_query_value(query.get("multi_model_only", ["0"])[0])

    if file_name:
        record = workflow.read_message_record(file_name, folder_name=folder_name)
        if record is None:
            return ApiResponse(status=404, payload={"error": "Message record not found"})
        return ApiResponse(status=200, payload=record)

    return ApiResponse(
        status=200,
        payload=workflow.read_message_options(multi_model_only=multi_model_only),
    )


def _handle_qualitative_message_siblings(parsed, workflow):
    query = parse_qs(parsed.query)
    file_name = query.get("file", [None])[0]
    if not file_name:
        return ApiResponse(status=400, payload={"error": "Missing file query parameter"})
    return ApiResponse(status=200, payload=workflow.read_sibling_message_options(file_name))


def _handle_ratings_folder(parsed, workflow):
    query = parse_qs(parsed.query)
    kind = query.get("kind", [None])[0]
    target_dir = workflow.paths.pairwise_ratings_dir if kind == "pairwise" else workflow.paths.ratings_dir
    return ApiResponse(status=200, payload=workflow.build_folder_summary(target_dir))


def handle_get_request(request_path, workflow, root_dir, dist_dir, data_dir):
    parsed = urlparse(request_path)

    if parsed.path == "/api/qualitative-messages":
        return _handle_qualitative_messages(parsed, workflow)
    if parsed.path == "/api/qualitative-message-siblings":
        return _handle_qualitative_message_siblings(parsed, workflow)
    if parsed.path == "/api/qualitative-ratings-folder":
        return _handle_ratings_folder(parsed, workflow)
    if parsed.path == "/api/qualitative-ratings":
        return ApiResponse(status=200, payload=workflow.read_aggregated_ratings())

    static_file = resolve_static_path(parsed.path, root_dir=root_dir, dist_dir=dist_dir, data_dir=data_dir)
    if static_file is not None:
        return ApiResponse(status=200, file_path=static_file)

    return ApiResponse(status=404, payload={"error": "Not Found"})


def handle_post_request(request_path, payload, workflow, auth_store=None):
    parsed = urlparse(request_path)
    if parsed.path == "/api/auth/login":
        if auth_store is None:
            return ApiResponse(status=500, payload={"error": "Auth store unavailable"})
        try:
            result = auth_store.authenticate_or_create_user(payload)
        except AuthError as error:
            return ApiResponse(status=error.status, payload={"error": str(error)})
        return ApiResponse(status=200, payload=result)

    if parsed.path not in {"/api/qualitative-ratings", "/api/qualitative-ratings-save"}:
        return ApiResponse(status=404, payload={"error": "Not Found"})

    try:
        result = workflow.save_ratings_payload(payload)
    except Exception:
        return ApiResponse(status=400, payload={"error": "Invalid ratings payload"})

    return ApiResponse(status=200, payload=result["nextFile"])
