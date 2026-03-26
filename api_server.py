#!/usr/bin/env python3

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from pairwise_rating_workflow import create_default_workflow

workflow = create_default_workflow()


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
            self._send_json(workflow.read_aggregated_ratings())
            return

        self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/qualitative-ratings":
            self._send_json({"error": "Not Found"}, status=404)
            return

        try:
            payload = self._read_json_body()
            result = workflow.save_ratings_payload(payload)
            self._send_json(result["nextFile"])
        except Exception:
            self._send_json({"error": "Invalid ratings payload"}, status=400)

    def handle_qualitative_messages(self, parsed):
        query = parse_qs(parsed.query)
        file_name = query.get("file", [None])[0]
        folder_name = query.get("folder", [None])[0]
        multi_model_only = query.get("multi_model_only", ["0"])[0] in {"1", "true", "yes"}
        if file_name:
            record = workflow.read_message_record(file_name, folder_name=folder_name)
            if record is None:
                self._send_json({"error": "Message record not found"}, status=404)
                return
            self._send_json(record)
            return

        self._send_json(workflow.read_message_options(multi_model_only=multi_model_only))

    def handle_ratings_folder(self, parsed):
        query = parse_qs(parsed.query)
        kind = query.get("kind", [None])[0]
        target_dir = workflow.paths.pairwise_ratings_dir if kind == "pairwise" else workflow.paths.ratings_dir
        self._send_json(workflow.build_folder_summary(target_dir))

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
