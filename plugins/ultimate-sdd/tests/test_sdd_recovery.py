"""Recovery is read-only except append-only machine checkpoints; Git is mocked."""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from sddlib import recovery  # noqa: E402

OLD = "a" * 40
NEW = "b" * 40
PARENT = "c" * 40
BODY = b"print('reviewed')\n"


class Recovery(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix=".recovery-test-", dir=ROOT)
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name).resolve()
        self.root = self.repo / "docs" / "plan"
        self.put("docs/plan/config.json", "{}\n")
        self.put("docs/plan/workflow.md", "# Project workflow\n")
        self.put("docs/plan/context/CATALOG.md", "# Context\n")
        self.put("docs/plan/context/platform.md", "# Platform\nGreenfield.\n")
        self.put("docs/plan/project.md", "---\nid: PROJECT\nstatus: active\n---\n")
        self.put("docs/plan/INDEX.md", "# Plan\nREQ-1 TASK-1\n")
        self.put("docs/plan/briefs/BRIEF-1-test.md", "---\nid: BRIEF-1\nstatus: aligned\n---\n")
        self.put("docs/plan/epics/EPIC-1-test.md", "---\nid: EPIC-1\nstatus: ready\n---\n")
        self.req_path = self.put("docs/plan/reqs/REQ-1-test.md", "---\nid: REQ-1\nepic: EPIC-1\nstatus: ready\nreadiness: 4\n---\n")
        self.task_path = self.put("docs/plan/tasks/REQ-1/TASK-1-test.md", "---\nid: TASK-1\nreq: REQ-1\nstatus: ready\n---\n")
        self.put("src/app.py", BODY.decode())
        self.review_fixture()
        self.head = NEW
        self.dirty = False
        self.non_git = True
        self.commits = {OLD: [PARENT], NEW: [OLD]}
        self.changed = {OLD: ["src/app.py"], NEW: ["src/app.py"]}
        self.unreachable: set[str] = set()
        self.git_calls: list[list[str]] = []
        self.mock_run = self.enterContext(patch.object(recovery.subprocess, "run", side_effect=self.git))
        self.gate = self.enterContext(patch.object(recovery, "check_task", return_value={"ok": True, "errors": []}))

    def put(self, path: str, text: str) -> Path:
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8"))
        return target

    def review_fixture(self, task="REQ-1/TASK-1", sources=None):
        from sddlib import gates
        path = self.root / f"verify/{task.replace('/', '-')}.reviews.json"
        path.unlink(missing_ok=True)
        if sources == {}:
            return path
        files = list(sources) if sources else ["src/app.py"]
        for name in files:
            if not (self.repo / name).exists():
                self.put(name, BODY.decode())
        for stage in ("spec", "quality"):
            evidence = f"evidence/{stage}.txt"
            self.put(evidence, f"Independent {stage} review: pass.\n")
            args = argparse.Namespace(repo=str(self.repo), root="docs/plan", json=True,
                task=task, stage=stage, status="pass", author="implementer",
                reviewer=f"{stage}-reviewer", evidence=evidence, files=files)
            stream = io.StringIO()
            with contextlib.redirect_stdout(stream):
                code = gates.cmd_review_record(args)
            self.assertEqual(code, 0, stream.getvalue())
        return path

    def git(self, argv, **kwargs):
        self.assertEqual(argv[0], "git", argv)
        args = argv[argv.index("-C") + 2:]
        self.git_calls.append(args)
        self.assertIn(args[0], {"rev-parse", "status", "merge-base", "rev-list", "diff-tree", "cat-file"})
        rc, output, error = 0, "", ""
        if self.non_git:
            rc, error = 128, "fatal: not a git repository (or any of the parent directories): .git"
        elif args == ["rev-parse", "--show-toplevel"]:
            output = str(self.repo) + "\n"
        elif args == ["rev-parse", "--verify", "--quiet", "HEAD"]:
            if self.head:
                output = self.head + "\n"
            else:
                rc = 1
        elif args[0] == "status":
            output = " M src/app.py\n" if self.dirty else ""
        elif args[:2] == ["rev-parse", "--verify"]:
            raw = args[-1].removesuffix("^{commit}")
            matches = [sha for sha in self.commits if sha.startswith(raw)]
            if len(matches) == 1:
                output = matches[0] + "\n"
            else:
                rc, error = 128, "unknown revision"
        elif args[:2] == ["merge-base", "--is-ancestor"]:
            if args[2] in self.unreachable or (args[2] == NEW and args[3] == OLD):
                rc = 1
        elif args[:2] == ["cat-file", "-p"]:
            sha = args[-1]
            output = f"tree {'e' * 40}\n" + "".join(f"parent {parent}\n" for parent in self.commits[sha]) + "\nCommit message\n"
        elif args[:2] == ["cat-file", "-e"]:
            output = ""
        elif args[0] == "diff-tree":
            output = "\0".join(self.changed[args[-1]]) + "\0"
        elif args[:2] == ["cat-file", "blob"]:
            output = BODY
        else:
            self.fail(f"Unexpected Git command: {args}")
        if kwargs.get("text", False):
            if isinstance(output, bytes):
                output = output.decode()
        else:
            if isinstance(output, str):
                output = output.encode()
            error = error.encode()
        return subprocess.CompletedProcess(argv, rc, output, error)

    def cli(self, *args: str):
        parser = argparse.ArgumentParser()
        recovery.register(parser.add_subparsers(dest="command", required=True))
        ns = parser.parse_args([*args, "--repo", str(self.repo), "--root", "docs/plan", "--json"])
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            code = ns.func(ns)
        data = json.loads(stream.getvalue())
        return code, data

    def checkpoint(self, commit=None, files=None, task="REQ-1/TASK-1"):
        args = ["checkpoint", "--task", task]
        if commit:
            args.append(f"--commit={commit}")
        if files:
            args.extend(["--files", *files])
        return self.cli(*args)

    def records(self):
        return sorted((self.root / "runs/checkpoints").glob("*.json"))

    def add_task(self):
        self.put("docs/plan/tasks/REQ-1/TASK-2-test.md", "---\nid: TASK-2\nreq: REQ-1\nstatus: ready\n---\n")
        self.review_fixture("REQ-1/TASK-2")

    def test_non_git_checkpoints_are_append_only(self):
        first = self.checkpoint()
        paths = self.records()
        saved = paths[0].read_bytes()
        second = self.checkpoint()
        self.assertEqual(first[0], 0, first)
        self.assertEqual(second[0], 0, second)
        self.assertEqual(len(self.records()), 2)
        self.assertEqual(paths[0].read_bytes(), saved)
        record = json.loads(saved)
        self.assertIsNone(record["commit"])
        self.assertIsNone(record["git"]["head"])
        self.assertEqual(record["next"]["target"], "REQ-1/TASK-1")

    def test_resume_rederives_next_and_preserves_handoff(self):
        self.checkpoint()
        self.req_path.write_text(self.req_path.read_text().replace("readiness: 4", "readiness: 2"), encoding="utf-8")
        handoff = self.put("docs/plan/HANDOFF.md", "# Human notes\nDo not repeat research.\n")
        before = {p: p.read_bytes() for p in self.repo.rglob("*") if p.is_file()}
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["next"]["action"], "specify")
        self.assertEqual(data["checkpoints"]["latest"]["next"]["action"], "load")
        self.assertEqual(handoff.read_bytes(), before[handoff])
        self.assertEqual(before, {p: p.read_bytes() for p in self.repo.rglob("*") if p.is_file()})
        self.gate.assert_called_with(self.repo, self.root, "REQ-1/TASK-1", phase="complete")

    def test_resume_reports_missing_setup_separately(self):
        (self.root / "workflow.md").unlink()
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertFalse(data["setup"]["complete"])
        self.assertIn("workflow.md", data["setup"]["missing"])

    def test_resume_reports_stale_reviews_not_pass(self):
        self.gate.return_value = {"ok": False, "errors": ["source snapshot is stale"]}
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertFalse(data["reviews"][0]["ok"])
        self.assertIn("stale", data["reviews"][0]["errors"][0])

    def test_resume_rejects_corrupt_checkpoint(self):
        self.put("docs/plan/runs/checkpoints/broken.json", "{broken")
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])
        self.assertTrue(data["errors"])

    def test_resume_rejects_wrong_checkpoint_shape(self):
        self.put("docs/plan/runs/checkpoints/broken.json", "{}")
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertIn("checkpoint", " ".join(data["errors"]).lower())

    def test_resume_rejects_malformed_pipeline_state(self):
        for content in ("{", "[]", '{"pipeline": 3}'):
            with self.subTest(content=content):
                self.put("docs/plan/runs/current.json", content)
                code, data = self.cli("resume")
                self.assertNotEqual(code, 0)
                self.assertFalse(data["ok"])

    def test_invalid_config_fails_visibly(self):
        self.put("docs/plan/config.json", '{"tdd": "sometimes"}')
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])

    def test_checkpoint_requires_existing_unambiguous_task(self):
        for selector in ("REQ-1/TASK-99", "TASK-1", "../../escape"):
            with self.subTest(selector=selector):
                code, data = self.checkpoint(task=selector)
                self.assertNotEqual(code, 0)
                self.assertFalse(data["ok"])
        self.put("docs/plan/tasks/REQ-1/TASK-1-copy.md", self.task_path.read_text())
        code, data = self.checkpoint()
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])

    def test_checkpoint_handles_repeated_task_numbers_in_different_reqs(self):
        self.put("docs/plan/reqs/REQ-2-test.md", "---\nid: REQ-2\nstatus: ready\nreadiness: 4\n---\n")
        self.put("docs/plan/tasks/REQ-2/TASK-1-test.md", "---\nid: TASK-1\nreq: REQ-2\nstatus: ready\n---\n")
        code, data = self.checkpoint(task="REQ-2/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(json.loads(self.records()[0].read_text())["task"], "REQ-2/TASK-1")

    def test_head_observation_is_not_owned_commit(self):
        self.non_git = False
        self.assertEqual(self.checkpoint()[0], 0)
        record = json.loads(self.records()[0].read_text())
        self.assertEqual(record["git"]["head"], NEW)
        self.assertIsNone(record["commit"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_commit_short_sha_resolves_to_full_and_scope_is_backed(self):
        self.non_git = False
        code, data = self.checkpoint(NEW[:8], ["src/app.py"])
        self.assertEqual(code, 0, data)
        record = json.loads(self.records()[0].read_text())
        self.assertEqual(record["commit"], NEW)
        self.assertEqual(record["scope"]["files"]["src/app.py"], hashlib.sha256(BODY).hexdigest())
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["commands"], [f"git revert {NEW}"])

    def test_checkpoint_rejects_non_git_explicit_commit(self):
        code, data = self.checkpoint(NEW)
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])
        self.assertEqual(self.records(), [])

    def test_checkpoint_rejects_invalid_unreachable_and_merge_commits(self):
        self.non_git = False
        for commit in ("HEAD", "--help", "d" * 40):
            with self.subTest(commit=commit):
                self.assertNotEqual(self.checkpoint(commit)[0], 0)
        self.unreachable.add(OLD)
        self.assertNotEqual(self.checkpoint(OLD)[0], 0)
        self.commits[NEW] = [OLD, PARENT]
        self.assertNotEqual(self.checkpoint(NEW)[0], 0)
        self.assertEqual(self.records(), [])

    def test_checkpoint_scope_cannot_escape_or_disagree_with_commit(self):
        self.non_git = False
        for files in (["../outside.py"], [str(self.repo / "src/app.py")], ["src/other.py"], ["src/app.py", "src/app.py"]):
            with self.subTest(files=files):
                self.assertNotEqual(self.checkpoint(NEW, files)[0], 0)
        self.assertNotEqual(self.checkpoint(files=["src/app.py"])[0], 0)

    def test_unproven_scope_keeps_checkpoint_but_refuses_commands(self):
        self.non_git = False
        self.gate.return_value = {"ok": False, "errors": ["quality review missing"]}
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertEqual(code, 0, data)
        self.assertTrue(data["warnings"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_passing_review_without_source_scope_does_not_prove_ownership(self):
        self.non_git = False
        self.review_fixture(sources={})
        self.checkpoint(NEW, ["src/app.py"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_review_scope_must_cover_every_commit_file(self):
        self.non_git = False
        self.review_fixture(sources={"src/other.py": hashlib.sha256(BODY).hexdigest()})
        self.checkpoint(NEW, ["src/app.py"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_reviewed_bytes_must_match_commit_blobs(self):
        self.non_git = False
        self.put("src/app.py", "uncommitted changes\n")
        self.checkpoint(NEW, ["src/app.py"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_revert_refuses_dirty_missing_unreachable_or_merge(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        self.dirty = True
        self.assertEqual(self.cli("revert-plan", "--task", "REQ-1/TASK-1")[1]["commands"], [])
        self.dirty = False
        self.unreachable.add(NEW)
        self.assertEqual(self.cli("revert-plan", "--task", "REQ-1/TASK-1")[1]["commands"], [])
        self.unreachable.clear()
        self.commits[NEW] = [OLD, PARENT]
        self.assertEqual(self.cli("revert-plan", "--task", "REQ-1/TASK-1")[1]["commands"], [])
        del self.commits[NEW]
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_revert_refuses_cross_task_commit_associations(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        self.add_task()
        self.checkpoint(NEW, ["src/app.py"], "REQ-1/TASK-2")
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])
        self.assertIn("multiple", " ".join(data["errors"]).lower())

    def test_revert_orders_by_ancestry_not_checkpoint_timestamp(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        self.checkpoint(OLD, ["src/app.py"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["commands"], [f"git revert {NEW}", f"git revert {OLD}"])

    def test_target_req_and_change_resolve_existing_graph(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        self.req_path.write_text(self.req_path.read_text().replace("status: ready", "change: CHANGE-1\nstatus: ready"), encoding="utf-8")
        self.put("docs/plan/changes/test/CHANGE.md", "---\nid: CHANGE-1\nreqs: [REQ-1]\nstatus: applying\n---\n")
        for selector in ("REQ-1", "CHANGE-1"):
            with self.subTest(selector=selector):
                code, data = self.cli("revert-plan", "--target", selector)
                self.assertEqual(code, 0, data)
                self.assertEqual(data["commands"], [f"git revert {NEW}"])
        self.add_task()
        code, data = self.cli("revert-plan", "--target", "REQ-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_scope_tampering_is_refused(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        path = self.records()[0]
        record = json.loads(path.read_text())
        record["scope"]["files"]["src/app.py"] = "0" * 64
        path.write_text(json.dumps(record), encoding="utf-8")
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_git_missing_and_unborn_head_are_usable(self):
        self.mock_run.side_effect = FileNotFoundError("git unavailable")
        self.assertEqual(self.checkpoint()[0], 0)
        self.assertEqual(self.cli("resume")[0], 0)
        self.mock_run.side_effect = self.git
        self.non_git = False
        self.head = None
        code, data = self.checkpoint()
        self.assertEqual(code, 0, data)
        self.assertIsNone(json.loads(self.records()[-1].read_text())["git"]["head"])

    def test_resume_api_returns_error_for_escaping_root(self):
        data = recovery.resume_state(self.repo, ROOT)
        self.assertFalse(data["ok"])
        self.assertTrue(data["errors"])

    def test_resume_rejects_malformed_review_state(self):
        self.put("docs/plan/verify/REQ-1-TASK-1.reviews.json", "{")
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])

    def test_resume_rejects_non_scalar_pipeline_status(self):
        self.put("docs/plan/runs/current.json", json.dumps({
            "pipeline": "small-feature", "stage": "apply", "status": [],
            "completed": [], "gates": [], "policy": {},
        }))
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])

    def test_revert_refuses_later_stale_reviews(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        self.gate.return_value = {"ok": False, "errors": ["evidence stale"]}
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_revert_is_read_only_even_on_success(self):
        self.non_git = False
        self.checkpoint(NEW, ["src/app.py"])
        before = {p: p.read_bytes() for p in self.repo.rglob("*") if p.is_file()}
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(before, {p: p.read_bytes() for p in self.repo.rglob("*") if p.is_file()})

    def test_checkpoint_does_not_replace_existing_filename(self):
        self.checkpoint()
        path = self.records()[0]
        before = path.read_bytes()
        with patch.object(recovery, "atomic_write_json", side_effect=OSError("storage full")):
            code, data = self.checkpoint()
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(len(self.records()), 1)

    def test_git_failures_other_than_non_git_are_visible(self):
        self.mock_run.side_effect = subprocess.TimeoutExpired("git", 15)
        self.assertNotEqual(self.cli("resume")[0], 0)
        self.assertNotEqual(self.checkpoint()[0], 0)

    def record_real_reviews(self, suffix=""):
        from sddlib import gates
        self.gate.side_effect = gates.check_task
        path = self.root / "verify/REQ-1-TASK-1.reviews.json"
        if not suffix:
            path.unlink()
        for stage in ("spec", "quality"):
            evidence = f"evidence/{stage}{suffix}.txt"
            self.put(evidence, f"Independent {stage} review of AC-1: pass.\n")
            parser = argparse.ArgumentParser()
            gates.register(parser.add_subparsers(dest="command", required=True))
            ns = parser.parse_args([
                "review-record", "--repo", str(self.repo), "--task", "REQ-1/TASK-1",
                "--stage", stage, "--status", "pass", "--author", "implementer",
                "--reviewer", stage + "-reviewer", "--evidence", evidence,
                "--files", "src/app.py", "--json",
            ])
            stream = io.StringIO()
            with contextlib.redirect_stdout(stream):
                result = ns.func(ns)
            self.assertEqual(result, 0, stream.getvalue())

    def test_real_gate_scope_supports_checkpoint_and_revert(self):
        self.non_git = False
        self.record_real_reviews()
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertEqual(code, 0, data)
        self.assertIsNotNone(data["state"]["scope"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["commands"], [f"git revert {NEW}"])
        self.put("src/app.py", "changed after review\n")
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertFalse(data["reviews"][0]["ok"])
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_real_review_append_preserves_historical_ownership_proof(self):
        self.non_git = False
        self.record_real_reviews()
        self.checkpoint(NEW, ["src/app.py"])
        self.record_real_reviews("-later")
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["commands"], [f"git revert {NEW}"])

    def test_historical_proof_cannot_be_substituted(self):
        self.non_git = False
        self.record_real_reviews()
        self.checkpoint(NEW, ["src/app.py"])
        path = self.records()[0]
        data = json.loads(path.read_text())
        data["scope"]["review"]["record_hash"] = "f" * 64
        path.write_text(json.dumps(data), encoding="utf-8")
        code, data = self.cli("revert-plan", "--task", "REQ-1/TASK-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    def test_malformed_task_cannot_disappear_from_broad_target(self):
        self.non_git = False
        self.record_real_reviews()
        self.checkpoint(NEW, ["src/app.py"])
        self.put("docs/plan/tasks/REQ-1/TASK-2-broken.md", "# Missing frontmatter\n")
        code, data = self.cli("revert-plan", "--target", "REQ-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])
        self.assertIn("TASK", " ".join(data["errors"]))
        self.assertNotEqual(self.cli("resume")[0], 0)

    def test_handoff_support_document_is_not_a_task(self):
        self.put("docs/plan/tasks/REQ-1/TASK-1.handoff.md", "# Loaded task\nHuman notes.\n")
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertEqual(len(data["reviews"]), 1)

    def test_shallow_merge_parents_are_read_from_raw_commit(self):
        self.non_git = False
        self.commits[NEW] = [OLD, PARENT]
        def shallow_git(argv, **kwargs):
            args = argv[argv.index("-C") + 2:]
            if args[0] == "rev-list":
                # Git history traversal lies by omission at a shallow boundary.
                return subprocess.CompletedProcess(argv, 0, NEW + "\n", "")
            return self.git(argv, **kwargs)
        self.mock_run.side_effect = shallow_git
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertNotEqual(code, 0)
        self.assertIn("Merge", " ".join(data["errors"]))
        self.assertEqual(self.records(), [])

    def test_missing_raw_parent_prevents_synthetic_root_scope(self):
        self.non_git = False
        def shallow_git(argv, **kwargs):
            args = argv[argv.index("-C") + 2:]
            if args[:2] == ["cat-file", "-e"]:
                return subprocess.CompletedProcess(argv, 128, "", "missing parent object")
            return self.git(argv, **kwargs)
        self.mock_run.side_effect = shallow_git
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertNotEqual(code, 0)
        self.assertEqual(self.records(), [])
        self.assertFalse(any(args[0] == "diff-tree" for args in self.git_calls))

    def test_single_parent_diff_uses_explicit_parent(self):
        self.non_git = False
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertEqual(code, 0, data)
        diff = next(args for args in self.git_calls if args[0] == "diff-tree")
        self.assertEqual(diff[-2:], [OLD, NEW])

    def test_structurally_invalid_review_history_fails_resume(self):
        path = self.root / "verify/REQ-1-TASK-1.reviews.json"
        valid = json.loads(path.read_text())
        invalid = [
            {**valid, "schema_version": True},
            {**valid, "schema_version": 1.0},
            {**valid, "history": []},
            {**valid, "history": [{}]},
            {**valid, "history": [[], 5]},
        ]
        for state in invalid:
            with self.subTest(state=state):
                path.write_text(json.dumps(state), encoding="utf-8")
                code, data = self.cli("resume")
                self.assertNotEqual(code, 0)
                self.assertFalse(data["ok"])
                self.assertIn("Malformed review", " ".join(data["errors"]))

    def test_corrupt_historical_review_hash_is_not_just_stale(self):
        path = self.root / "verify/REQ-1-TASK-1.reviews.json"
        data = json.loads(path.read_text())
        data["history"][0]["record_hash"] = "0" * 64
        path.write_text(json.dumps(data), encoding="utf-8")
        code, data = self.cli("resume")
        self.assertNotEqual(code, 0)
        self.assertFalse(data["ok"])

    @unittest.skipUnless(sys.platform == "win32", "Windows case-insensitive filesystem")
    def test_windows_task_directory_casing_cannot_hide_damage(self):
        self.non_git = False
        self.record_real_reviews()
        self.checkpoint(NEW, ["src/app.py"])
        self.put("docs/plan/tasks/REQ-1/TASK-2-broken.md", "# Missing frontmatter\n")
        original = self.root / "tasks"
        temporary = self.root / "tasks-renaming"
        original.rename(temporary)
        temporary.rename(self.root / "TASKS")
        self.assertNotEqual(self.cli("resume")[0], 0)
        code, data = self.cli("revert-plan", "--target", "REQ-1")
        self.assertNotEqual(code, 0)
        self.assertEqual(data["commands"], [])

    @unittest.skipUnless(sys.platform == "win32", "Windows case-insensitive filesystem")
    def test_windows_req_and_project_casing_cannot_hide_damage(self):
        original = self.root / "reqs"
        original.rename(self.root / "reqs-renaming")
        (self.root / "reqs-renaming").rename(self.root / "REQS")
        self.put("docs/plan/REQS/REQ-2-broken.md", "# Missing frontmatter\n")
        self.assertNotEqual(self.cli("resume")[0], 0)
        (self.root / "REQS/REQ-2-broken.md").unlink()
        self.put("docs/plan/project.md", "# Missing frontmatter\n")
        (self.root / "project.md").rename(self.root / "project-renaming.md")
        (self.root / "project-renaming.md").rename(self.root / "PROJECT.MD")
        self.assertNotEqual(self.cli("resume")[0], 0)

    @unittest.skipUnless(sys.platform == "win32", "Windows case-insensitive filesystem")
    def test_windows_lowercase_paths_preserve_canonical_frontmatter_ids(self):
        path = self.task_path
        path.rename(path.with_name("renaming.md"))
        path.with_name("renaming.md").rename(path.with_name("task-1-test.md"))
        code, data = self.cli("resume")
        self.assertEqual(code, 0, data)
        self.assertEqual(data["reviews"][0]["task"], "REQ-1/TASK-1")

    def test_non_utf8_commit_message_does_not_change_ascii_parent_scope(self):
        self.non_git = False
        def legacy_git(argv, **kwargs):
            args = argv[argv.index("-C") + 2:]
            if args[:2] == ["cat-file", "-p"]:
                self.assertFalse(kwargs["text"])
                headers = f"tree {'e' * 40}\nparent {OLD}\nencoding ISO-8859-1\n\n".encode("ascii")
                return subprocess.CompletedProcess(argv, 0, headers + b"Caf\xe9\n", b"")
            return self.git(argv, **kwargs)
        self.mock_run.side_effect = legacy_git
        code, data = self.checkpoint(NEW, ["src/app.py"])
        self.assertEqual(code, 0, data)
        self.assertIsNotNone(data["state"]["scope"])


if __name__ == "__main__":
    unittest.main()
