#!/usr/bin/env python3

import json
import tempfile
from pathlib import Path

from pairwise_rating_workflow import PairwiseWorkflowPaths, PairwiseRatingWorkflow, extract_message_text, get_first_user_message


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build_test_root():
    temp_dir = tempfile.TemporaryDirectory(prefix="pairwise-workflow-")
    root = Path(temp_dir.name)

    paths = PairwiseWorkflowPaths(
        root=root,
        ratings_file=root / "data/qualitative/message_ratings.json",
        ratings_dir=root / "data/qualitative/message_ratings",
        pairwise_ratings_dir=root / "data/qualitative/message_pariwise_ratings",
        legacy_messages_dir=root / "data/qualitative/messages",
        messages_v2_dir=root / "data/qualitative/messages_v2",
        messages_v3_dir=root / "data/qualitative/messages_v3",
        messages_v4_dir=root / "data/qualitative/new_message_data",
    )

    write_json(paths.ratings_file, {"version": 1, "savedAt": None, "records": {}})
    paths.ratings_dir.mkdir(parents=True, exist_ok=True)
    paths.pairwise_ratings_dir.mkdir(parents=True, exist_ok=True)

    scenario = "引导式讲题辅导"
    question_key = "q_demo_pairwise"
    models = [
        {
            "model_key": "qz__model-a",
            "run_id": "run-demo-a",
            "session_id": "session-demo-a",
            "title": "demo-a",
            "reply": "先找百位和个位交换后，差一定和 99 的倍数有关。",
        },
        {
            "model_key": "qz__model-b",
            "run_id": "run-demo-b",
            "session_id": "session-demo-b",
            "title": "demo-b",
            "reply": "可以把三位数写成 100a + 10b + c，再和 100c + 10b + a 作差。",
        },
    ]

    for item in models:
        run_dir = paths.messages_v4_dir / "四个场景" / scenario / question_key / item["model_key"]
        write_json(
            run_dir / "run.json",
            {
                "runId": item["run_id"],
                "teacherSessionId": item["session_id"],
                "sceneName": scenario,
                "title": item["title"],
                "teacherAgent": "build",
                "followUpCount": 2,
                "studentInitialQuestion": "一个三位数换个位和百位后，与原数的差怎么求？",
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

    return temp_dir, PairwiseRatingWorkflow(paths)
def build_pairwise_payload(message_options, candidate_a_record, candidate_b_record):
    candidate_a = message_options[0]
    candidate_b = message_options[1]
    question = extract_message_text(get_first_user_message(candidate_a_record))
    saved_at = "2026-03-26T12:34:56.000Z"
    updated_at = "2026-03-26T12:34:56.000Z"

    return {
        "version": 1,
        "savedAt": saved_at,
        "records": {
            candidate_a["recordId"]: {
                "record_id": candidate_a["recordId"],
                "scenario": candidate_a["scenario"],
                "question": question,
                "turn_count": len(candidate_a_record.get("messages", [])),
                "updatedAt": updated_at,
                "pairwise": {
                    "winner": "b",
                },
                "pairwise_meta": {
                    "candidate_a_file": candidate_a["fileName"],
                    "candidate_b_file": candidate_b["fileName"],
                },
            }
        },
    }


def run_workflow_demo():
    temp_dir, workflow = build_test_root()

    try:
        print("1. workflow.read_aggregated_ratings()")
        ratings = workflow.read_aggregated_ratings()
        assert ratings["records"] == {}

        print("2. workflow.read_message_options()")
        message_options = workflow.read_message_options()
        assert len(message_options) >= 2

        candidate_a_file = message_options[0]["fileName"]
        candidate_b_file = message_options[1]["fileName"]
        print(f"   candidate A: {candidate_a_file}")
        print(f"   candidate B: {candidate_b_file}")

        print("3. workflow.read_message_record(candidate_a_file)")
        candidate_a_record = workflow.read_message_record(candidate_a_file)
        assert candidate_a_record is not None

        print("4. workflow.read_message_record(candidate_b_file)")
        candidate_b_record = workflow.read_message_record(candidate_b_file)
        assert candidate_b_record is not None

        print("5. workflow.build_folder_summary(pairwise_ratings_dir)")
        folder_before = workflow.build_folder_summary(workflow.paths.pairwise_ratings_dir)
        assert folder_before["fileCount"] == 0

        print("6. workflow.save_ratings_payload(payload)")
        payload = build_pairwise_payload(message_options, candidate_a_record, candidate_b_record)
        saved_result = workflow.save_ratings_payload(payload)
        saved = saved_result["nextFile"]
        assert payload["records"].keys() <= saved["records"].keys()

        record_id = next(iter(payload["records"].keys()))
        assert saved["records"][record_id]["pairwise"]["winner"] == "b"

        print("7. workflow.build_folder_summary(pairwise_ratings_dir)")
        folder_after = workflow.build_folder_summary(workflow.paths.pairwise_ratings_dir)
        assert folder_after["fileCount"] == 1
        assert folder_after["files"][0]["recordCount"] == 1

        snapshot_files = sorted(workflow.paths.pairwise_ratings_dir.glob("*.json"))
        assert len(snapshot_files) == 1

        result = {
            "messageOptionsCount": len(message_options),
            "savedRecordId": record_id,
            "pairwiseSnapshot": str(snapshot_files[0]),
            "folderAfter": folder_after,
        }
        print("Workflow OK")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        temp_dir.cleanup()


if __name__ == "__main__":
    run_workflow_demo()
