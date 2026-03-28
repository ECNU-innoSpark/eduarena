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


def seed_multi_model_messages(paths: PairwiseWorkflowPaths) -> None:
    question_folders = [
        ("四个场景/引导式讲题辅导/q_demo_a", "第一道题"),
        ("四个场景/引导式讲题辅导/q_demo_b", "第二道题"),
    ]
    for question_folder, question_title in question_folders:
        for model_name in ("qz__glm-5", "qz__Kimi-K25", "qz__qwen3.5-397b"):
            run_dir = paths.messages_v4_dir / question_folder / model_name
            write_json(
                run_dir / "run.json",
                {
                    "question": question_title,
                    "scenario": "build",
                    "record_id": f"{question_folder}-{model_name}",
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


class PairwiseDropdownVariantsTest(unittest.TestCase):
    def test_read_message_options_returns_all_three_model_variants_for_each_question(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            paths = build_paths(root)
            workflow = PairwiseRatingWorkflow(paths)
            seed_multi_model_messages(paths)

            message_options = workflow.read_message_options(multi_model_only=True)

            self.assertEqual(len(message_options), 6)
            self.assertEqual(
                [item["fileName"] for item in message_options],
                [
                    "四个场景/引导式讲题辅导/q_demo_a/qz__Kimi-K25/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_a/qz__glm-5/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_a/qz__qwen3.5-397b/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_b/qz__Kimi-K25/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_b/qz__glm-5/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_b/qz__qwen3.5-397b/conversation-messages.json",
                ],
            )
            self.assertEqual(
                [item["label"] for item in message_options],
                [
                    "第一道题",
                    "第一道题",
                    "第一道题",
                    "第二道题",
                    "第二道题",
                    "第二道题",
                ],
            )

    def test_read_sibling_message_options_returns_only_candidate_a_siblings(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            paths = build_paths(root)
            workflow = PairwiseRatingWorkflow(paths)
            seed_multi_model_messages(paths)

            sibling_options = workflow.read_sibling_message_options(
                "四个场景/引导式讲题辅导/q_demo_a/qz__glm-5/conversation-messages.json"
            )

            self.assertEqual(
                sibling_options,
                [
                    {
                        "fileName": "qz__Kimi-K25/conversation-messages.json",
                        "label": "qz__Kimi-K25",
                        "scenario": "build",
                        "recordId": "四个场景/引导式讲题辅导/q_demo_a-qz__Kimi-K25",
                    },
                    {
                        "fileName": "qz__qwen3.5-397b/conversation-messages.json",
                        "label": "qz__qwen3.5-397b",
                        "scenario": "build",
                        "recordId": "四个场景/引导式讲题辅导/q_demo_a-qz__qwen3.5-397b",
                    },
                ],
            )


if __name__ == "__main__":
    unittest.main()
