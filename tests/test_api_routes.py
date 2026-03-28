import tempfile
import unittest
from pathlib import Path

from api_routes import handle_get_request, handle_post_request, resolve_static_path


class StubPaths:
    def __init__(self):
        self.ratings_dir = Path("/tmp/ratings")
        self.pairwise_ratings_dir = Path("/tmp/pairwise_ratings")


class StubWorkflow:
    def __init__(self):
        self.paths = StubPaths()
        self.saved_payload = None
        self.fail_on_save = False

    def read_message_record(self, file_name, folder_name=None):
        if file_name == "missing.json":
            return None
        return {"fileName": file_name, "folderName": folder_name}

    def read_message_options(self, multi_model_only=False):
        return [{"multiModelOnly": multi_model_only}]

    def read_sibling_message_options(self, file_name):
        return [{"fileName": file_name, "label": "sibling"}]

    def read_aggregated_ratings(self):
        return {"records": {"a": 1}}

    def build_folder_summary(self, target_dir):
        return {"dir": str(target_dir)}

    def save_ratings_payload(self, payload):
        if self.fail_on_save:
            raise ValueError("bad payload")
        self.saved_payload = payload
        return {"nextFile": {"saved": True, "payload": payload}}


class ApiRoutesTest(unittest.TestCase):
    def test_handle_get_message_options_parses_boolean_query(self):
        workflow = StubWorkflow()

        response = handle_get_request(
            "/api/qualitative-messages?multi_model_only=true",
            workflow=workflow,
            root_dir=Path("/tmp/root"),
            dist_dir=Path("/tmp/dist"),
            data_dir=Path("/tmp/data"),
        )

        self.assertEqual(response.status, 200)
        self.assertEqual(response.payload, [{"multiModelOnly": True}])

    def test_handle_get_message_record_returns_404_when_missing(self):
        workflow = StubWorkflow()

        response = handle_get_request(
            "/api/qualitative-messages?file=missing.json",
            workflow=workflow,
            root_dir=Path("/tmp/root"),
            dist_dir=Path("/tmp/dist"),
            data_dir=Path("/tmp/data"),
        )

        self.assertEqual(response.status, 404)
        self.assertEqual(response.payload, {"error": "Message record not found"})

    def test_handle_get_siblings_requires_file_query(self):
        workflow = StubWorkflow()

        response = handle_get_request(
            "/api/qualitative-message-siblings",
            workflow=workflow,
            root_dir=Path("/tmp/root"),
            dist_dir=Path("/tmp/dist"),
            data_dir=Path("/tmp/data"),
        )

        self.assertEqual(response.status, 400)
        self.assertEqual(response.payload, {"error": "Missing file query parameter"})

    def test_handle_post_request_saves_payload_without_http_server(self):
        workflow = StubWorkflow()
        payload = {"records": {"abc": {"score": 5}}}

        response = handle_post_request("/api/qualitative-ratings-save", payload=payload, workflow=workflow)

        self.assertEqual(response.status, 200)
        self.assertEqual(workflow.saved_payload, payload)
        self.assertEqual(response.payload["payload"], payload)

    def test_handle_post_request_maps_save_errors_to_bad_request(self):
        workflow = StubWorkflow()
        workflow.fail_on_save = True

        response = handle_post_request("/api/qualitative-ratings", payload={"broken": True}, workflow=workflow)

        self.assertEqual(response.status, 400)
        self.assertEqual(response.payload, {"error": "Invalid ratings payload"})

    def test_resolve_static_path_supports_spa_fallback_and_blocks_traversal(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root_dir = Path(tmp_dir)
            dist_dir = root_dir / "dist"
            data_dir = root_dir / "data"
            dist_dir.mkdir()
            data_dir.mkdir()
            (dist_dir / "index.html").write_text("<html></html>", encoding="utf-8")
            (dist_dir / "app.js").write_text("console.log('ok')", encoding="utf-8")
            (data_dir / "sample.json").write_text("{}", encoding="utf-8")

            self.assertEqual(
                resolve_static_path("/app.js", root_dir=root_dir, dist_dir=dist_dir, data_dir=data_dir),
                (dist_dir / "app.js").resolve(),
            )
            self.assertEqual(
                resolve_static_path("/dashboard", root_dir=root_dir, dist_dir=dist_dir, data_dir=data_dir),
                (dist_dir / "index.html").resolve(),
            )
            self.assertEqual(
                resolve_static_path("/data/sample.json", root_dir=root_dir, dist_dir=dist_dir, data_dir=data_dir),
                (data_dir / "sample.json").resolve(),
            )
            self.assertIsNone(
                resolve_static_path("/data/../secret.txt", root_dir=root_dir, dist_dir=dist_dir, data_dir=data_dir)
            )


if __name__ == "__main__":
    unittest.main()
