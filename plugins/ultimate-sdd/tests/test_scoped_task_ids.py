"""REQ-scoped TASK identity, dependency and derived board contracts."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from planlib.board import render_index, write_index  # noqa: E402
from planlib.graph import blocker_edges, has_cycle, is_unblocked, next_action  # noqa: E402
from planlib.parse import by_id_map, collect  # noqa: E402
from planlib.validate import validate_tree  # noqa: E402


class ScopedTaskIds(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="scoped-task-test-", dir=ROOT)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.root = self.repo / "docs" / "plan"
        self.root.mkdir(parents=True)
        (self.root / "INDEX.md").write_text("# Test plan\n", encoding="utf-8")
        self.put("project.md", id="PROJECT", title="Scoped tasks", status="active", prd="docs/prd/test.md")
        self.put("epics/EPIC-1.md", id="EPIC-1", status="ready")
        self.req("REQ-1")

    def put(self, relative: str, **fields: str) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        text = "---\n" + "".join(f"{key}: {value}\n" for key, value in fields.items()) + "---\n\n# Fixture\n"
        path.write_text(text, encoding="utf-8")
        return path

    def req(self, fid: str, **fields: str) -> Path:
        values = {"id": fid, "epic": "EPIC-1", "status": "ready", "readiness": "4", "blocked_by": "[]", "blocks": "[]"}
        values.update(fields)
        return self.put(f"reqs/{fid}.md", **values)

    def task(self, req: str, fid: str, **fields: str) -> Path:
        values = {"id": fid, "req": req, "status": "ready", "blocked_by": "[]", "blocks": "[]"}
        values.update(fields)
        return self.put(f"tasks/{req}/{fid}.md", **values)

    def action(self) -> dict[str, str]:
        return next_action(self.root, collect(self.root))

    def validate(self):
        write_index(self.root)
        return validate_tree(self.root)

    def opposite_chains(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1", status="done", blocks="[TASK-2]")
        self.task("REQ-1", "TASK-2", blocked_by="[TASK-1]")
        self.task("REQ-2", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-2", "TASK-2", status="done", blocks="[TASK-1]")

    def test_lookup_qualifies_only_task_ids_without_mutating_frontmatter(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1")
        self.task("REQ-2", "TASK-1")
        self.put("changes/fix/CHANGE.md", id="CHANGE-1", status="proposed", skip_specs="true")
        artifacts = collect(self.root)
        before = [(path, dict(fm)) for path, fm in artifacts]
        lookup = by_id_map(artifacts)
        self.assertEqual(set(lookup), {"PROJECT", "EPIC-1", "REQ-1", "REQ-2", "CHANGE-1", "REQ-1/TASK-1", "REQ-2/TASK-1"})
        self.assertEqual(lookup["REQ-1/TASK-1"][1]["id"], "TASK-1")
        self.assertEqual(lookup["REQ-2/TASK-1"][1]["req"], "REQ-2")
        self.assertEqual(artifacts, before)

    def test_repeated_task_numbers_and_opposite_chains_validate(self) -> None:
        self.opposite_chains()
        result = self.validate()
        self.assertEqual(result.errors, [])
        self.assertEqual(result.warnings, [])

    def test_duplicate_in_one_req_is_an_error_with_qualified_id(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1")
        self.task("REQ-2", "TASK-1")
        self.put("tasks/REQ-1/TASK-1-copy.md", id="TASK-1", req="REQ-1", status="ready")
        duplicates = [e for e in self.validate().errors if "duplicate id" in e]
        self.assertEqual(len(duplicates), 1)
        self.assertIn("duplicate id REQ-1/TASK-1:", duplicates[0])

    def test_task_requires_existing_parent_to_have_scoped_identity(self) -> None:
        for parent in ("", "REQ-404", "EPIC-1"):
            with self.subTest(parent=parent):
                self.put("tasks/orphan.md", id="TASK-1", req=parent, status="ready")
                self.assertTrue(any("req" in error.lower() for error in self.validate().errors))

    def test_blocker_edges_keep_same_numbers_in_separate_graphs(self) -> None:
        self.opposite_chains()
        edges = blocker_edges(collect(self.root))
        self.assertEqual(edges, {"REQ-1/TASK-1": ["REQ-1/TASK-2"], "REQ-2/TASK-2": ["REQ-2/TASK-1"]})
        self.assertIsNone(has_cycle(edges))

    def test_same_number_blocker_state_is_resolved_within_parent(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-1", "TASK-2", status="sent-back", blocks="[TASK-1]")
        self.task("REQ-2", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-2", "TASK-2", status="done", blocks="[TASK-1]")
        artifacts = collect(self.root)
        for ordered in (artifacts, list(reversed(artifacts))):
            with self.subTest(order=[fm["req"] for _, fm in ordered if "req" in fm]):
                lookup = by_id_map(ordered)
                first = next(fm for _, fm in ordered if fm["id"] == "TASK-1" and fm["req"] == "REQ-1")
                second = next(fm for _, fm in ordered if fm["id"] == "TASK-1" and fm["req"] == "REQ-2")
                self.assertFalse(is_unblocked(first, lookup))
                self.assertTrue(is_unblocked(second, lookup))
                action = next_action(self.root, ordered)
                self.assertEqual((action["action"], action["target"]), ("load", "REQ-2/TASK-1"))

    def test_missing_local_blocker_does_not_resolve_in_another_req(self) -> None:
        self.req("REQ-2", status="done")
        self.task("REQ-1", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-2", "TASK-2", status="done")
        errors = self.validate().errors
        self.assertTrue(any("REQ-1/TASK-1" in e and "does not exist" in e for e in errors), errors)
        self.assertNotEqual(self.action()["action"], "load")

    def test_local_and_same_req_qualified_reciprocal_links_are_equivalent(self) -> None:
        self.task("REQ-1", "TASK-1", status="done", blocks="[REQ-1/TASK-2]")
        self.task("REQ-1", "TASK-2", blocked_by="[TASK-1]")
        result = self.validate()
        self.assertEqual(result.errors + result.warnings, [])
        self.assertEqual(self.action()["target"], "REQ-1/TASK-2")
        self.task("REQ-1", "TASK-1", status="done", blocks="[TASK-2]")
        self.task("REQ-1", "TASK-2", blocked_by="[REQ-1/TASK-1]")
        result = self.validate()
        self.assertEqual(result.errors + result.warnings, [])
        self.assertEqual(self.action()["target"], "REQ-1/TASK-2")

    def test_cross_req_task_links_are_rejected_in_both_directions(self) -> None:
        self.req("REQ-2", status="done")
        self.task("REQ-2", "TASK-1", status="done")
        for relation in ("blocked_by", "blocks"):
            for other in ("REQ-2/TASK-1", "REQ-2"):
                with self.subTest(relation=relation, other=other):
                    self.task("REQ-1", "TASK-1", **{relation: f"[{other}]"})
                    errors = self.validate().errors
                    self.assertTrue(any("REQ-1/TASK-1" in e and relation in e and "same REQ" in e for e in errors), errors)
                    if relation == "blocked_by":
                        self.assertNotEqual(self.action()["action"], "load")

    def test_missing_mutual_blocks_cannot_be_satisfied_by_another_parent(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1", status="done")
        self.task("REQ-1", "TASK-2", blocked_by="[TASK-1]")
        self.task("REQ-2", "TASK-1", status="done", blocks="[TASK-2]")
        self.task("REQ-2", "TASK-2", blocked_by="[TASK-1]")
        result = self.validate()
        self.assertEqual(result.errors, [])
        self.assertEqual(len(result.warnings), 1, result.warnings)
        self.assertIn("REQ-1/TASK-2 lists blocked_by TASK-1", result.warnings[0])
        self.assertIn("does not list blocks", result.warnings[0])

    def test_missing_reverse_blocked_by_is_reported(self) -> None:
        self.task("REQ-1", "TASK-1", status="done", blocks="[TASK-2]")
        self.task("REQ-1", "TASK-2")
        result = self.validate()
        self.assertEqual(result.errors, [])
        self.assertEqual(len(result.warnings), 1, result.warnings)
        self.assertIn("REQ-1/TASK-1 lists blocks TASK-2", result.warnings[0])
        self.assertIn("does not list blocked_by", result.warnings[0])

    def test_cycle_reports_parent_qualified_tasks(self) -> None:
        self.opposite_chains()
        self.task("REQ-1", "TASK-1", blocked_by="[REQ-1/TASK-2]", blocks="[TASK-2]")
        self.task("REQ-1", "TASK-2", blocked_by="[TASK-1]", blocks="[REQ-1/TASK-1]")
        cycles = [error for error in self.validate().errors if "dependency cycle" in error]
        self.assertEqual(len(cycles), 1)
        self.assertIn("REQ-1/TASK-1", cycles[0])
        self.assertIn("REQ-1/TASK-2", cycles[0])
        self.assertNotIn("REQ-2/", cycles[0])

    def test_self_cycle_reports_qualified_id(self) -> None:
        self.task("REQ-1", "TASK-1", blocked_by="[TASK-1]", blocks="[TASK-1]")
        self.assertTrue(any("REQ-1/TASK-1" in e and "dependency cycle" in e for e in self.validate().errors))
        self.assertNotEqual(self.action()["action"], "load")

    def test_board_registry_qualifies_tasks_and_preserves_artifact_bytes(self) -> None:
        self.opposite_chains()
        before = {p: p.read_bytes() for p, _ in collect(self.root)}
        text = render_index(self.root)
        for parent in ("REQ-1", "REQ-2"):
            for task in ("TASK-1", "TASK-2"):
                self.assertIn(f"| {parent}/{task} |", text)
        self.assertNotIn("| TASK-1 |", text)
        self.assertIn("/ultimate-sdd:load REQ-1/TASK-2", text)
        self.assertEqual({p: p.read_bytes() for p in before}, before)

    def test_index_requires_qualified_task_mentions(self) -> None:
        self.req("REQ-2")
        self.task("REQ-1", "TASK-1")
        self.task("REQ-2", "TASK-1")
        (self.root / "INDEX.md").write_text("EPIC-1 REQ-1 REQ-2 TASK-1 REQ-1/TASK-1\n", encoding="utf-8")
        self.assertIn("REQ-2/TASK-1 not mentioned in INDEX.md", validate_tree(self.root).warnings)

    def test_next_only_offers_pending_tasks_of_loadable_parents(self) -> None:
        for parent_status in ("ready", "in-progress", "review"):
            for task_status in ("planned", "ready"):
                with self.subTest(parent_status=parent_status, task_status=task_status):
                    self.req("REQ-1", status=parent_status)
                    self.task("REQ-1", "TASK-1", status=task_status)
                    action = self.action()
                    self.assertEqual((action["action"], action["target"], action["command"]),
                                     ("load", "REQ-1/TASK-1", "/ultimate-sdd:load REQ-1/TASK-1"))

    def test_next_does_not_reload_non_pending_tasks(self) -> None:
        for status in ("sent-back", "done", "cancelled", "blocked", "in-progress"):
            with self.subTest(status=status):
                self.task("REQ-1", "TASK-1", status=status)
                self.assertNotEqual(self.action()["action"], "load")

    def test_next_does_not_load_unready_or_terminal_parents(self) -> None:
        self.task("REQ-1", "TASK-1")
        for status in ("done", "cancelled", "blocked", "idea", "framing", "specified"):
            with self.subTest(status=status):
                self.req("REQ-1", status=status)
                self.assertNotEqual(self.action()["action"], "load")
        for readiness in ("", "0", "1", "2", "3", "6", "unknown"):
            with self.subTest(readiness=readiness):
                self.req("REQ-1", readiness=readiness)
                self.assertNotEqual(self.action()["action"], "load")

    def test_next_does_not_load_orphan_task(self) -> None:
        self.req("REQ-1", status="done")
        self.task("REQ-404", "TASK-1")
        self.assertNotEqual(self.action()["action"], "load")

    def test_next_only_treats_done_task_blockers_as_satisfied(self) -> None:
        self.task("REQ-1", "TASK-2", blocked_by="[TASK-1]")
        for status in ("planned", "ready", "blocked", "in-progress", "sent-back", "cancelled", "done"):
            with self.subTest(status=status):
                self.task("REQ-1", "TASK-1", status=status, blocks="[TASK-2]")
                lookup = by_id_map(collect(self.root))
                child = next(fm for _, fm in collect(self.root) if fm["id"] == "TASK-2")
                self.assertEqual(is_unblocked(child, lookup), status == "done")
                if status == "done":
                    self.assertEqual(self.action()["target"], "REQ-1/TASK-2")
                else:
                    self.assertNotEqual(self.action()["target"], "REQ-1/TASK-2")

    def test_parent_blocker_wins_even_with_stale_ready_status(self) -> None:
        self.req("REQ-1", blocked_by="[REQ-2]")
        self.req("REQ-2", status="cancelled", blocks="[REQ-1]")
        self.task("REQ-1", "TASK-1")
        self.assertNotEqual(self.action()["action"], "load")

    def test_blocked_requirements_are_not_specified_or_scoped_due_to_stale_status(self) -> None:
        self.req("REQ-2", status="cancelled", blocks="[REQ-1]")
        for readiness in ("2", "4"):
            with self.subTest(readiness=readiness):
                self.req("REQ-1", readiness=readiness, blocked_by="[REQ-2]")
                self.assertEqual(self.action()["action"], "clean")

    def test_done_blocker_with_sent_back_ancestor_does_not_unlock_task(self) -> None:
        self.task("REQ-1", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-1", "TASK-2", status="done", blocked_by="[TASK-3]", blocks="[TASK-1]")
        self.task("REQ-1", "TASK-3", status="sent-back", blocks="[TASK-2]")
        self.assertNotEqual(self.action()["action"], "load")

    def test_done_requirement_with_unfinished_ancestor_does_not_unlock_child_task(self) -> None:
        self.req("REQ-1", blocked_by="[REQ-2]")
        self.req("REQ-2", status="done", blocked_by="[REQ-3]", blocks="[REQ-1]")
        self.req("REQ-3", status="cancelled", blocks="[REQ-2]")
        self.task("REQ-1", "TASK-1")
        self.assertNotEqual(self.action()["action"], "load")

    def test_done_dependency_cycle_does_not_unlock_task(self) -> None:
        self.task("REQ-1", "TASK-1", blocked_by="[TASK-2]")
        self.task("REQ-1", "TASK-2", status="done", blocked_by="[TASK-3]", blocks="[TASK-1, TASK-3]")
        self.task("REQ-1", "TASK-3", status="done", blocked_by="[TASK-2]", blocks="[TASK-2]")
        self.assertNotEqual(self.action()["action"], "load")

    def test_parent_readiness_is_implicit_not_a_done_dependency(self) -> None:
        self.task("REQ-1", "TASK-1", blocked_by="[REQ-1]")
        for status in ("ready", "done"):
            with self.subTest(status=status):
                self.req("REQ-1", status=status)
                errors = self.validate().errors
                self.assertTrue(any("parent readiness is checked separately" in e for e in errors), errors)
                self.assertNotEqual(self.action()["action"], "load")

    def test_requirement_cycle_still_reports_global_ids(self) -> None:
        self.req("REQ-1", blocked_by="[REQ-2]", blocks="[REQ-2]")
        self.req("REQ-2", blocked_by="[REQ-1]", blocks="[REQ-1]")
        self.assertTrue(any("dependency cycle" in e and "REQ-1" in e and "REQ-2" in e for e in self.validate().errors))

    def test_archive_and_resume_priorities_survive_repeated_task_numbers(self) -> None:
        self.req("REQ-1", status="done", change="CHANGE-1")
        self.req("REQ-2", status="done", change="CHANGE-1")
        self.task("REQ-1", "TASK-1", status="done")
        self.task("REQ-2", "TASK-1", status="done")
        self.put("changes/fix/CHANGE.md", id="CHANGE-1", slug="fix", status="verifying", skip_specs="true", reqs="[REQ-1, REQ-2]")
        self.assertEqual(self.action()["action"], "archive")
        self.assertEqual(self.action()["command"], "/ultimate-sdd:archive fix")
        (self.root / "runs").mkdir()
        (self.root / "runs" / "current.json").write_text("{}", encoding="utf-8")
        self.assertEqual(self.action()["action"], "resume")

    def test_cli_board_next_and_both_validators_agree(self) -> None:
        self.opposite_chains()
        env = os.environ.copy()
        env.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONUTF8": "1"})
        env.update({key: str(self.repo) for key in ("TMP", "TEMP", "TMPDIR")})

        def run(script: str, *args: str) -> subprocess.CompletedProcess[str]:
            return subprocess.run(
                [sys.executable, str(SCRIPTS / script), *args, "--root", str(self.root)],
                cwd=self.repo, env=env, text=True, encoding="utf-8", capture_output=True, timeout=30,
            )

        for script, args in (("plan.py", ("board", "--write")), ("plan.py", ("validate",)), ("validate_plan.py", ())):
            result = run(script, *args)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        result = run("plan.py", "next", "--json")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(json.loads(result.stdout), self.action())
        self.assertIn(self.action()["command"], (self.root / "INDEX.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
