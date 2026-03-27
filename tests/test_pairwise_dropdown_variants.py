import json
import tempfile
import unittest
from pathlib import Path

from pairwise_rating_workflow import PairwiseRatingWorkflow, PairwiseWorkflowPaths


def build_paths(root: Path) -> PairwiseWorkflowPaths:
    return PairwiseWorkflowPaths(
        root=root,
        ratings_file=root / "ratings.json",
        ratings_dir=root / "ratings",
        pairwise_ratings_dir=root / "pairwise_ratings",
        legacy_messages_dir=root / "messages_v1",
        messages_v2_dir=root / "messages_v2",
        messages_v3_dir=root / "messages_v3",
        messages_v4_dir=root / "messages_v4",
    )


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def get_candidate_variant(file_name: str) -> str:
    parts = [part for part in str(file_name or "").split("/") if part]
    return "/".join(parts[-2:]) if len(parts) > 1 else str(file_name or "")


def get_candidate_variant_label(file_name: str) -> str:
    parts = [part for part in str(file_name or "").split("/") if part]
    return parts[-2] if len(parts) > 1 else str(file_name or "")


def build_candidate_b_options(message_options):
    variant_map = {}
    for item in message_options:
        variant_file = get_candidate_variant(item["fileName"])
        print('*' * 50 + f'''\n{variant_file}\n^^^(variant_file)^^^\n''' + '''\nat:\ngit_repos/eduarena/tests/test_pairwise_dropdown_variants.py:41\n''' + '*' * 50)
        import importlib
        if (importlib.import_module('socket').gethostname() in {'wsy-pretrain2-cpu-kq--169ddeec5a64-onoqafwz75'} or 'mac' in importlib.import_module('socket').gethostname().lower()) and importlib.import_module('os').environ.get('LOCAL_RANK', '0') == '0': importlib.import_module('sys').path.append(importlib.import_module('os.path').expandvars('$HOME/klee_code/'));  import python_code.borrowed_klee_python_code.pdb; python_code.borrowed_klee_python_code.pdb.set_trace()
        if variant_file in variant_map:
            continue
        variant_map[variant_file] = {
            "fileName": variant_file,
            "label": get_candidate_variant_label(item["fileName"]),
            "scenario": item.get("scenario"),
            "recordId": item.get("recordId"),
        }
    return sorted(variant_map.values(), key=lambda item: str(item["label"]).casefold())


class PairwiseDropdownVariantsTest(unittest.TestCase):
    def test_candidate_b_options_show_three_model_variants_for_same_question(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            paths = build_paths(root)
            workflow = PairwiseRatingWorkflow(paths)

            shared_question = "四个场景/引导式讲题辅导/q_demo"
            for model_name in ("qz__glm-5", "qz__Kimi-K25", "qz__qwen3.5-397b"):
                run_dir = paths.messages_v4_dir / shared_question / model_name
                write_json(
                    run_dir / "run.json",
                    {
                        "question": "同一道题",
                        "scenario": "build",
                        "record_id": f"rec-{model_name}",
                    },
                )
                write_json(
                    run_dir / "conversation-messages.json",
                    {"messages": [{"role": "user", "content": "hello"}]},
                )

            single_model_dir = paths.messages_v4_dir / "四个场景/引导式讲题辅导/q_single" / "qz__glm-5"
            write_json(
                single_model_dir / "run.json",
                {
                    "question": "只有一个模型，不应该出现在 multi_model_only 结果里",
                    "scenario": "build",
                    "record_id": "rec-single",
                },
            )
            write_json(
                single_model_dir / "conversation-messages.json",
                {"messages": [{"role": "user", "content": "single"}]},
            )

            message_options = workflow.read_message_options(multi_model_only=True)

            candidate_b_options = build_candidate_b_options(message_options)

            self.assertEqual(
                [item["label"] for item in candidate_b_options],
                ["qz__glm-5", "qz__Kimi-K25", "qz__qwen3.5-397b"],
            )
            self.assertEqual(
                [item["fileName"] for item in candidate_b_options],
                [
                    "qz__glm-5/conversation-messages.json",
                    "qz__Kimi-K25/conversation-messages.json",
                    "qz__qwen3.5-397b/conversation-messages.json",
                ],
            )


if __name__ == "__main__":
    unittest.main()
