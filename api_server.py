#!/usr/bin/env python3

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from api_routes import handle_get_request, handle_post_request
from pairwise_rating_workflow import create_default_workflow
from user_auth_store import create_default_auth_store

workflow = create_default_workflow()
auth_store = create_default_auth_store()
ROOT_DIR = Path(__file__).resolve().parent
DIST_DIR = ROOT_DIR / "dist"
DATA_DIR = ROOT_DIR / "data"


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

    def _send_file(self, file_path):
        body = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        response = handle_get_request(
            self.path,
            workflow=workflow,
            root_dir=ROOT_DIR,
            dist_dir=DIST_DIR,
            data_dir=DATA_DIR,
        )
        if response.file_path is not None:
            self._send_file(response.file_path)
            return
        self._send_json(response.payload, status=response.status)

    def do_POST(self):
        response = handle_post_request(
            self.path,
            payload=self._read_json_body(),
            workflow=workflow,
            auth_store=auth_store,
        )
        self._send_json(response.payload, status=response.status)

    def log_message(self, format, *args):
        return


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("API_PORT") or os.environ.get("PORT") or "5174")
    server = ThreadingHTTPServer((host, port), ApiHandler)
    print(f"Web: http://{host}:{port}/")
    print(f"API: http://{host}:{port}/api/qualitative-ratings")
    server.serve_forever()


if __name__ == "__main__":
    main()
