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
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def seed_pairwise_workspace(paths: PairwiseWorkflowPaths) -> None:
    write_json(paths.ratings_file, {"version": 1, "savedAt": None, "records": {}})
    paths.ratings_dir.mkdir(parents=True, exist_ok=True)
    paths.pairwise_ratings_dir.mkdir(parents=True, exist_ok=True)

    scenario = "引导式讲题辅导"
    question_folder = "四个场景/引导式讲题辅导/q_demo_pairwise"
    model_payloads = [
        {
            "model_name": "qz__glm-5",
            "record_id": "record-glm-5",
            "title": "同一道题",
            "reply": "先把原数写成 100a + 10b + c，再写交换后的数。",
        },
        {
            "model_name": "qz__Kimi-K25",
            "record_id": "record-kimi-k25",
            "title": "同一道题",
            "reply": "比较两个式子后，差值一定能整理成 99 的倍数。",
        },
        {
            "model_name": "qz__qwen3.5-397b",
            "record_id": "record-qwen-397b",
            "title": "同一道题",
            "reply": "可以直接列出原数和倒序数，再用代数化简。",
        },
    ]

    for item in model_payloads:
        run_dir = paths.messages_v4_dir / question_folder / item["model_name"]
        write_json(
            run_dir / "run.json",
            {
                "question": item["title"],
                "scenario": scenario,
                "record_id": item["record_id"],
                "followUpCount": 3,
            },
        )
        write_json(
            run_dir / "conversation-messages.json",
            {
                "messages": [
                    {"role": "system", "content": "You are a math tutor."},
                    {"role": "user", "content": "一个三位数换个位和百位后，与原数的差怎么求？"},
                    {"role": "assistant", "content": item["reply"]},
                ]
            },
        )

    single_model_dir = paths.messages_v4_dir / "四个场景/引导式讲题辅导/q_single" / "qz__glm-5"
    write_json(
        single_model_dir / "run.json",
        {
            "question": "单模型题目",
            "scenario": scenario,
            "record_id": "record-single",
        },
    )
    write_json(
        single_model_dir / "conversation-messages.json",
        {
            "messages": [
                {"role": "user", "content": "这个题目不应出现在 multi_model_only 列表中。"},
            ]
        },
    )


class PairwiseInitialLoadingTest(unittest.TestCase):
    def test_pairwise_initial_loading_and_save_flow_matches_ui_request_order(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            paths = build_paths(root)
            workflow = PairwiseRatingWorkflow(paths)
            seed_pairwise_workspace(paths)

            saved_ratings_file = workflow.read_aggregated_ratings()
            self.assertEqual(saved_ratings_file, {"version": 1, "savedAt": None, "records": {}})

            message_options = workflow.read_message_options(multi_model_only=True)
            self.assertEqual(
                [item["fileName"] for item in message_options],
                [
                    "四个场景/引导式讲题辅导/q_demo_pairwise/qz__Kimi-K25/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_pairwise/qz__glm-5/conversation-messages.json",
                    "四个场景/引导式讲题辅导/q_demo_pairwise/qz__qwen3.5-397b/conversation-messages.json",
                ],
            )

            pairwise_folder_summary_before = workflow.build_folder_summary(workflow.paths.pairwise_ratings_dir)
            self.assertEqual(pairwise_folder_summary_before["fileCount"], 0)

            selected_candidate_a_file = message_options[1]["fileName"]
            candidate_a_record = workflow.read_message_record(selected_candidate_a_file)
            self.assertIsNotNone(candidate_a_record)
            self.assertEqual(candidate_a_record["messages"][2]["role"], "assistant")

            candidate_b_options = workflow.read_sibling_message_options(selected_candidate_a_file)
            self.assertEqual(
                candidate_b_options,
                [
                    {
                        "fileName": "qz__Kimi-K25/conversation-messages.json",
                        "label": "qz__Kimi-K25",
                        "scenario": "引导式讲题辅导",
                        "recordId": "record-kimi-k25",
                    },
                    {
                        "fileName": "qz__qwen3.5-397b/conversation-messages.json",
                        "label": "qz__qwen3.5-397b",
                        "scenario": "引导式讲题辅导",
                        "recordId": "record-qwen-397b",
                    },
                ],
            )

            selected_candidate_b_variant = candidate_b_options[0]["fileName"]
            candidate_a_folder = "四个场景/引导式讲题辅导/q_demo_pairwise"
            candidate_b_record = workflow.read_message_record(
                selected_candidate_b_variant,
                folder_name=candidate_a_folder,
            )
            self.assertIsNotNone(candidate_b_record)
            self.assertEqual(
                candidate_b_record["messages"][2]["content"],
                "比较两个式子后，差值一定能整理成 99 的倍数。",
            )

            next_file = {
                "version": 1,
                "savedAt": "2026-03-28T09:30:00.000Z",
                "records": {
                    "record-glm-5": {
                        "record_id": "record-glm-5",
                        "scenario": "引导式讲题辅导",
                        "question": "同一道题",
                        "turn_count": 3,
                        "updatedAt": "2026-03-28T09:30:00.000Z",
                        "pairwise": {
                            "winner": "b",
                            "better_answer": "b",
                            "reasoning": "b",
                            "confidence": "high",
                            "note": "Kimi 版本解释更直接。",
                        },
                        "pairwise_meta": {
                            "candidate_a_file": selected_candidate_a_file,
                            "candidate_b_file": f"{candidate_a_folder}/{selected_candidate_b_variant}",
                        },
                    }
                },
            }

            save_result = workflow.save_ratings_payload(next_file)

            self.assertEqual(save_result["targetDir"], workflow.paths.pairwise_ratings_dir)
            self.assertEqual(save_result["nextFile"]["records"]["record-glm-5"]["pairwise"]["winner"], "b")
            self.assertTrue(save_result["snapshotPath"].exists())

            self.assertEqual(
                save_result["nextFile"]["records"]["record-glm-5"]["pairwise_meta"]["candidate_b_file"],
                "四个场景/引导式讲题辅导/q_demo_pairwise/qz__Kimi-K25/conversation-messages.json",
            )
            self.assertEqual(workflow.read_aggregated_ratings()["records"], {})

            pairwise_folder_summary_after = workflow.build_folder_summary(workflow.paths.pairwise_ratings_dir)
            self.assertEqual(pairwise_folder_summary_after["fileCount"], 1)
            self.assertEqual(pairwise_folder_summary_after["files"][0]["recordCount"], 1)


if __name__ == "__main__":
    unittest.main()
