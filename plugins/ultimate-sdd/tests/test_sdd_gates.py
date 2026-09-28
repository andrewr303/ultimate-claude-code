"""Regression contracts for local evidence gates and their plan CLI consumers.

All repositories, escape targets, and evidence are disposable fixtures beneath
this plugin. Hash-chain tests model ordinary edits, not cryptographic provenance
or an attacker who can rewrite and rehash the entire local history.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import date
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.dont_write_bytecode = True
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import merge_deltas  # noqa: E402
import plan as plan_cli  # noqa: E402
from sddlib import gates  # noqa: E402


class GateFixture(unittest.TestCase):
    selector = "REQ-1/TASK-1"

    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="sdd-gates-", dir=ROOT)
        self.addCleanup(temporary.cleanup)
        self.workspace = Path(temporary.name).resolve()
        self.repo = self.workspace / "repo"
        self.root = self.repo / "docs" / "plan"
        self.write(self.root / "config.json", "{}\n")
        self.write(self.root / "INDEX.md", "# Unmodified fixture index\n")
        self.write(
            self.root / "project.md",
            "---\nid: PROJECT\ntitle: Gate fixture\nstatus: active\n"
            "root: docs/plan\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n",
        )
        self.write(
            self.root / "epics" / "EPIC-1-work.md",
            "---\nid: EPIC-1\ntitle: Verified work\nstatus: in-progress\n"
            "reqs: [REQ-1]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n",
        )
        self.req = self.requirement()
        self.task = self.task_file()
        self.write(self.repo / "src" / "app.py", "VALUE = 1\n")
        self.write(self.repo / "src" / "other.py", "OTHER = 2\n")
        self.write(self.repo / "logs" / "spec.log", "Acceptance criteria passed.\n")
        self.write(self.repo / "logs" / "quality.log", "Quality checks passed.\n")
        self.change = self.root / "changes" / "verified-work" / "CHANGE.md"
        self.write(
            self.change,
            "---\nid: CHANGE-1\ntitle: Verified work\nslug: verified-work\n"
            "status: verifying\nreqs: [REQ-1]\ndeltas: [app]\n"
            "skip_specs: false\nretire_capabilities: false\n"
            "created: 2026-01-01\nupdated: 2026-01-01\n---\n\n"
            "# CHANGE-1 — Verified work\n",
        )
        self.write(
            self.change.parent / "deltas" / "app.md",
            "## ADDED Requirements\n\n### Requirement: Verified work\n"
            "The system SHALL publish verified work.\n\n"
            "#### Scenario: reviewed\n- WHEN both reviews pass\n"
            "- THEN the work is published\n",
        )
        self.truth = self.root / "truth" / "app" / "spec.md"
        self.write(
            self.truth,
            "# App Specification\n\n## Purpose\n\nExisting behavior.\n\n"
            "## Requirements\n\n### Requirement: Existing work\n"
            "The system SHALL retain existing work.\n\n"
            "#### Scenario: existing\n- WHEN read\n- THEN existing work remains\n",
        )

    def write(self, path: Path, text: str) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def requirement(
        self,
        req_id: str = "REQ-1",
        *,
        status: str = "ready",
        readiness: int = 4,
        blocked_by: str = "[]",
        blocks: str = "[]",
        change: str = "CHANGE-1",
    ) -> Path:
        return self.write(
            self.root / "reqs" / f"{req_id}-work.md",
            f"---\nid: {req_id}\ntitle: Verified work\nepic: EPIC-1\n"
            f"status: {status}\nreadiness: {readiness}\n"
            f"blocked_by: {blocked_by}\nblocks: {blocks}\nchange: {change}\n"
            "audit_status: original\naudit_updated: original\n"
            "created: 2026-01-01\nupdated: 2026-01-01\n---\n\n"
            f"# {req_id}\n\n## Acceptance criteria\n\n"
            "- AC-1: Given reviewed work, when published, then it is available.\n\n"
            "status: body text is part of the contract\n"
            "updated: body text is also part of the contract\n",
        )

    def task_file(
        self,
        req_id: str = "REQ-1",
        task_id: str = "TASK-1",
        *,
        status: str = "planned",
        blocked_by: str = "[]",
        blocks: str = "[]",
    ) -> Path:
        return self.write(
            self.root / "tasks" / req_id / f"{task_id}-work.md",
            f"---\nid: {task_id}\nreq: {req_id}\ntitle: Publish work\n"
            f"status: {status}\nblocked_by: {blocked_by}\nblocks: {blocks}\n"
            "ac: [AC-1]\naudit_status: original\naudit_updated: original\n"
            "created: 2026-01-01\nupdated: 2026-01-01\n---\n\n"
            f"# {req_id}/{task_id}\n\nImplement src/app.py and run the checks.\n\n"
            "status: body text is part of the contract\n"
            "updated: body text is also part of the contract\n",
        )

    def frontmatter(self, path: Path, **updates: object) -> None:
        text = path.read_text(encoding="utf-8")
        self.assertTrue(text.startswith("---\n"))
        header, body = text[4:].split("---\n", 1)
        lines = []
        remaining = dict(updates)
        for line in header.splitlines():
            key = line.partition(":")[0]
            if key in remaining:
                value = remaining.pop(key)
                if value is not None:
                    lines.append(f"{key}: {value}")
            else:
                lines.append(line)
        lines.extend(f"{key}: {value}" for key, value in remaining.items() if value is not None)
        self.write(path, "---\n" + "\n".join(lines) + "\n---\n" + body)

    def command(self, *argv: str) -> tuple[int, dict]:
        parser = argparse.ArgumentParser()
        gates.register(parser.add_subparsers(dest="command", required=True))
        args = parser.parse_args(
            [*argv, "--repo", str(self.repo), "--root", "docs/plan", "--json"]
        )
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = args.func(args)
        self.assertIsInstance(code, int)
        self.assertTrue(stdout.getvalue().strip(), stderr.getvalue())
        payload = json.loads(stdout.getvalue())
        self.assertIsInstance(payload, dict)
        return code, payload

    def record(
        self,
        stage: str = "spec",
        *,
        status: str = "pass",
        author: str = "implementer",
        reviewer: str | None = None,
        evidence: str | None = None,
        files: tuple[str, ...] = ("src/app.py",),
        selector: str | None = None,
        ok: bool | None = True,
    ) -> dict:
        code, payload = self.command(
            "review-record", "--task", selector or self.selector,
            "--stage", stage, "--status", status, "--author", author,
            "--reviewer", reviewer if reviewer is not None else f"{stage}-reviewer",
            "--evidence", evidence if evidence is not None else f"logs/{stage}.log",
            "--files", *files,
        )
        if ok is not None:
            self.assertIs(payload.get("ok"), ok, payload)
            if ok:
                self.assertEqual(code, 0, payload)
            else:
                self.assertNotEqual(code, 0, payload)
        return payload

    def passing_pair(self, selector: str | None = None, **kwargs) -> None:
        self.record("spec", selector=selector, **kwargs)
        self.record("quality", selector=selector, **kwargs)

    def task_gate(
        self, *, phase: str = "complete", selector: str | None = None, ok: bool
    ) -> dict:
        result = gates.check_task(self.repo, self.root, selector or self.selector, phase=phase)
        self.assertIsInstance(result, dict)
        self.assertIs(result.get("ok"), ok, result)
        self.assertIsInstance(result.get("errors"), list, result)
        if ok:
            self.assertEqual(result["errors"], [], result)
        else:
            self.assertTrue(result["errors"], result)
        return result

    def change_gate(self, selector: str = "CHANGE-1", *, ok: bool) -> dict:
        result = gates.check_change(self.repo, self.root, selector)
        self.assertIsInstance(result, dict)
        self.assertIs(result.get("ok"), ok, result)
        self.assertIsInstance(result.get("errors"), list, result)
        self.assertEqual(bool(result["errors"]), not ok, result)
        return result

    def review_path(self, selector: str | None = None) -> Path:
        return self.root / "verify" / f"{(selector or self.selector).replace('/', '-')}.reviews.json"

    def history(self, selector: str | None = None) -> dict:
        return json.loads(self.review_path(selector).read_text(encoding="utf-8"))

    def write_history(self, payload: object) -> None:
        self.write(self.review_path(), json.dumps(payload, indent=2) + "\n")

    def snapshot(self) -> dict[str, bytes | None]:
        return {
            path.relative_to(self.root).as_posix(): path.read_bytes() if path.is_file() else None
            for path in self.root.rglob("*")
        }

    def done(self) -> None:
        self.frontmatter(self.req, status="done")
        self.frontmatter(self.task, status="done")

    def plan(self, *argv: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-B", str(SCRIPTS / "plan.py"), *argv],
            cwd=cwd or self.repo,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )

    def ready_to_load(self) -> list[str]:
        proc = self.plan("apply-status", "--change", "CHANGE-1", "--root", "docs/plan", "--json")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        rows = json.loads(proc.stdout)["reqs"]
        return next(row["ready_to_load"] for row in rows if row["req"] == "REQ-1")


class TaskEligibility(GateFixture):
    def test_load_needs_no_reviews_but_complete_defaults_to_requiring_them(self) -> None:
        self.task_gate(phase="load", ok=True)
        self.task_gate(ok=False)
        result = gates.check_task(self.repo, self.root, self.selector)
        self.assertIs(result["ok"], False, result)
        for phase, expected in (("load", True), ("complete", False)):
            code, payload = self.command("gate", "--task", self.selector, "--phase", phase)
            self.assertEqual(code == 0, expected, payload)
            self.assertIs(payload["ok"], expected, payload)

    def test_load_accepts_only_eligible_statuses_and_readiness_four_or_five(self) -> None:
        for readiness in (4, 5):
            for req_status in ("ready", "in-progress", "review"):
                for task_status in ("planned", "ready", "in-progress", "sent-back"):
                    with self.subTest(readiness=readiness, req=req_status, task=task_status):
                        self.frontmatter(self.req, readiness=readiness, status=req_status)
                        self.frontmatter(self.task, status=task_status)
                        self.task_gate(phase="load", ok=True)

    def test_complete_allows_eligible_statuses_including_done(self) -> None:
        self.passing_pair()
        for req_status in ("ready", "in-progress", "review", "done"):
            for task_status in ("planned", "ready", "in-progress", "sent-back", "done"):
                with self.subTest(req=req_status, task=task_status):
                    self.frontmatter(self.req, status=req_status)
                    self.frontmatter(self.task, status=task_status)
                    self.task_gate(ok=True)
        code, payload = self.command("gate", "--task", self.selector, "--phase", "complete")
        self.assertEqual(code, 0, payload)
        self.assertIs(payload["ok"], True, payload)

    def test_load_rejects_done_parent_or_done_task(self) -> None:
        for path in (self.req, self.task):
            with self.subTest(path=path.name):
                original = path.read_bytes()
                self.frontmatter(path, status="done")
                self.task_gate(phase="load", ok=False)
                path.write_bytes(original)

    def test_both_phases_reject_missing_blocked_cancelled_and_invalid_statuses(self) -> None:
        self.passing_pair()
        for path, invalid in (
            (self.req, (None, "", "blocked", "cancelled", "invalid", "idea", "framing", "specified")),
            (self.task, (None, "", "blocked", "cancelled", "invalid", "review")),
        ):
            original = path.read_bytes()
            for status in invalid:
                with self.subTest(path=path.name, status=status):
                    path.write_bytes(original)
                    self.frontmatter(path, status=status)
                    for phase in ("load", "complete"):
                        self.task_gate(phase=phase, ok=False)
            path.write_bytes(original)

    def test_both_phases_reject_invalid_readiness(self) -> None:
        self.passing_pair()
        for value in (None, "", -1, 0, 1, 2, 3, 6, "four", "4.0", "true"):
            with self.subTest(readiness=value):
                self.frontmatter(self.req, readiness=value)
                self.task_gate(phase="load", ok=False)
                self.task_gate(ok=False)

    def test_complete_accepts_readiness_five_when_reviewed_at_five(self) -> None:
        self.frontmatter(self.req, readiness=5)
        self.passing_pair()
        self.task_gate(ok=True)

    def test_missing_or_mismatched_artifact_identities_fail_closed(self) -> None:
        self.passing_pair()
        for path, updates in (
            (self.req, {"id": "REQ-2"}),
            (self.req, {"id": None}),
            (self.task, {"id": "TASK-2"}),
            (self.task, {"id": None}),
            (self.task, {"req": "REQ-2"}),
            (self.task, {"req": None}),
        ):
            with self.subTest(path=path.name, updates=updates):
                original = path.read_bytes()
                self.frontmatter(path, **updates)
                for phase in ("load", "complete"):
                    self.task_gate(phase=phase, ok=False)
                path.write_bytes(original)
        for path in (self.req, self.task):
            with self.subTest(missing=path.name):
                original = path.read_bytes()
                path.unlink()
                for phase in ("load", "complete"):
                    self.task_gate(phase=phase, ok=False)
                path.write_bytes(original)

    def test_missing_task_is_not_borrowed_from_another_req_or_prefix_match(self) -> None:
        self.passing_pair()
        self.requirement("REQ-2", change="")
        self.task_file("REQ-2")
        self.passing_pair("REQ-2/TASK-1")
        self.task_file(task_id="TASK-10")
        self.passing_pair("REQ-1/TASK-10")
        self.task.unlink()
        for phase in ("load", "complete"):
            self.task_gate(phase=phase, ok=False)
        self.record(ok=False)

    def test_duplicate_req_or_scoped_task_identity_is_ambiguous(self) -> None:
        for path in (self.req, self.task):
            with self.subTest(path=path.name):
                duplicate = path.with_name(path.stem + "-duplicate.md")
                duplicate.write_bytes(path.read_bytes())
                self.task_gate(phase="load", ok=False)
                self.task_gate(ok=False)
                duplicate.unlink()

    def test_selectors_reject_traversal_unscoped_and_foreign_ids(self) -> None:
        self.passing_pair()
        invalid = (
            "TASK-1", "REQ-2/TASK-1", "REQ-1/TASK-99", "REQ-0/TASK-1",
            "REQ-1/TASK-0", "REQ-1/TASK-1/extra", "../REQ-1/TASK-1",
            "REQ-1/../TASK-1", "REQ-1/../../TASK-1", "REQ-1\\TASK-1",
            "/REQ-1/TASK-1", "C:/REQ-1/TASK-1", "REQ-1/TASK-1.md",
        )
        before = self.snapshot()
        for selector in invalid:
            with self.subTest(selector=selector):
                for phase in ("load", "complete"):
                    self.task_gate(selector=selector, phase=phase, ok=False)
                self.record(selector=selector, ok=False)
                self.assertEqual(self.snapshot(), before)

    def test_parent_blockers_must_exist_and_be_done_in_both_phases(self) -> None:
        blocker = self.requirement("REQ-2", status="done", blocks="[REQ-1]", change="")
        self.frontmatter(self.req, blocked_by="[REQ-2]")
        self.passing_pair()
        self.task_gate(phase="load", ok=True)
        self.task_gate(ok=True)
        for status in ("planned", "ready", "in-progress", "blocked", "cancelled", "invalid", None):
            with self.subTest(status=status):
                self.frontmatter(blocker, status=status)
                self.task_gate(phase="load", ok=False)
                self.task_gate(ok=False)
        blocker.unlink()
        self.task_gate(phase="load", ok=False)
        self.task_gate(ok=False)

    def test_task_blockers_must_exist_and_be_done_in_both_phases(self) -> None:
        blocker = self.task_file(task_id="TASK-2", status="done", blocks="[TASK-1]")
        self.frontmatter(self.task, blocked_by="[TASK-2]")
        self.passing_pair()
        self.task_gate(phase="load", ok=True)
        self.task_gate(ok=True)
        for status in ("planned", "ready", "in-progress", "blocked", "cancelled", "invalid", None):
            with self.subTest(status=status):
                self.frontmatter(blocker, status=status)
                self.task_gate(phase="load", ok=False)
                self.task_gate(ok=False)
        blocker.unlink()
        self.task_gate(phase="load", ok=False)
        self.task_gate(ok=False)

    def test_other_reqs_task_one_cannot_satisfy_a_local_dependency(self) -> None:
        self.frontmatter(self.task, status="done", blocks="[TASK-2]")
        self.task_file(task_id="TASK-2", blocked_by="[TASK-1]")
        self.requirement("REQ-2", status="done", change="")
        self.task_file("REQ-2", status="done")
        selector = "REQ-1/TASK-2"
        self.passing_pair(selector)
        self.task_gate(selector=selector, phase="load", ok=True)
        self.task_gate(selector=selector, ok=True)
        self.frontmatter(self.task, status="planned")
        for phase in ("load", "complete"):
            self.task_gate(selector=selector, phase=phase, ok=False)
        self.task.unlink()
        for phase in ("load", "complete"):
            self.task_gate(selector=selector, phase=phase, ok=False)

    def test_explicit_foreign_task_dependency_is_not_local(self) -> None:
        self.requirement("REQ-2", status="done", change="")
        self.task_file("REQ-2", status="done")
        self.passing_pair()
        self.frontmatter(self.task, blocked_by="[REQ-2/TASK-1]")
        self.task_gate(phase="load", ok=False)
        self.task_gate(ok=False)


class ReviewRecords(GateFixture):
    def test_review_history_schema_hashes_and_current_spec_pointer(self) -> None:
        files = ("src/app.py", "src/other.py")
        self.record("spec", files=files)
        self.record("quality", files=tuple(reversed(files)))
        self.task_gate(ok=True)
        document = self.history()
        self.assertEqual(document["schema_version"], 1)
        self.assertIs(type(document["schema_version"]), int)
        self.assertEqual(document["task"], self.selector)
        history = document["history"]
        self.assertEqual(len(history), 2)
        required = {
            "sequence", "stage", "status", "author", "reviewer", "recorded_at",
            "evidence", "source_hashes", "contract", "contract_fingerprint",
            "spec_review", "previous_hash", "record_hash",
        }
        for number, entry in enumerate(history, 1):
            self.assertTrue(required.issubset(entry), entry)
            self.assertEqual(entry["sequence"], number)
            self.assertIs(type(entry["sequence"]), int)
            self.assertEqual(entry["stage"], ("spec", "quality")[number - 1])
            self.assertEqual(entry["status"], "pass")
            self.assertEqual(entry["author"], "implementer")
            self.assertNotEqual(entry["reviewer"], entry["author"])
            self.assertIsInstance(entry["recorded_at"], str)
            self.assertTrue(entry["recorded_at"].strip())
            evidence = entry["evidence"]
            self.assertEqual(evidence["path"], f"logs/{entry['stage']}.log")
            self.assertEqual(evidence["sha256"], hashlib.sha256((self.repo / evidence["path"]).read_bytes()).hexdigest())
            self.assertEqual(set(entry["source_hashes"]), set(files))
            for relative, digest in entry["source_hashes"].items():
                self.assertEqual(digest, hashlib.sha256((self.repo / relative).read_bytes()).hexdigest())
            for kind, path in (("req", self.req), ("task", self.task)):
                contract = entry["contract"][kind]
                self.assertEqual(contract["path"], path.relative_to(self.repo).as_posix())
                self.assertRegex(contract["sha256"], r"^[0-9a-f]{64}$")
            self.assertRegex(entry["contract_fingerprint"], r"^[0-9a-f]{64}$")
            self.assertRegex(entry["record_hash"], r"^[0-9a-f]{64}$")
        self.assertIn(history[0]["previous_hash"], (None, ""))
        self.assertIsNone(history[0]["spec_review"])
        self.assertEqual(history[1]["previous_hash"], history[0]["record_hash"])
        self.assertEqual(history[1]["spec_review"], history[0]["record_hash"])
        self.assertEqual(history[1]["contract_fingerprint"], history[0]["contract_fingerprint"])

    def test_spec_then_quality_is_required(self) -> None:
        self.record("quality", ok=False)
        self.task_gate(ok=False)
        self.record("spec")
        self.task_gate(ok=False)
        self.record("quality")
        self.task_gate(ok=True)

    def test_new_spec_invalidates_old_quality_until_rereview(self) -> None:
        self.passing_pair()
        old_spec = self.history()["history"][0]["record_hash"]
        self.record("spec")
        self.task_gate(ok=False)
        self.record("quality")
        self.task_gate(ok=True)
        history = self.history()["history"]
        self.assertEqual(len(history), 4)
        self.assertEqual(history[-1]["spec_review"], history[-2]["record_hash"])
        self.assertNotEqual(history[-1]["spec_review"], old_spec)

    def test_latest_failed_spec_cannot_fall_back_to_an_old_pass(self) -> None:
        self.passing_pair()
        self.record("spec", status="fail", ok=False)
        self.assertEqual(self.history()["history"][-1]["status"], "fail")
        self.task_gate(ok=False)
        self.record("quality", ok=False)
        self.task_gate(ok=False)

    def test_latest_failed_quality_overrides_an_older_pass_and_is_retained(self) -> None:
        self.passing_pair()
        self.record("quality", status="fail", ok=False)
        self.assertEqual([row["status"] for row in self.history()["history"]], ["pass", "pass", "fail"])
        self.task_gate(ok=False)
        self.record("quality")
        self.task_gate(ok=True)

    def test_self_review_is_rejected_at_each_stage(self) -> None:
        self.record("spec", reviewer="implementer", ok=False)
        self.task_gate(ok=False)
        self.record("spec")
        self.record("quality", reviewer="implementer", ok=False)
        self.task_gate(ok=False)

    def test_author_and_file_scope_must_match_current_spec(self) -> None:
        self.record("spec")
        for kwargs in (
            {"author": "other-implementer"},
            {"files": ("src/other.py",)},
            {"files": ("src/app.py", "src/other.py")},
        ):
            with self.subTest(kwargs=kwargs):
                self.record("quality", ok=None, **kwargs)
                self.task_gate(ok=False)
        self.passing_pair(files=("src/app.py", "src/other.py"))
        self.task_gate(ok=True)

    def test_source_changed_after_spec_requires_new_spec_not_only_quality(self) -> None:
        self.record("spec")
        self.write(self.repo / "src" / "app.py", "VALUE = 9\n")
        self.record("quality", ok=None)
        self.task_gate(ok=False)
        self.passing_pair()
        self.task_gate(ok=True)

    def test_failed_reviews_are_cumulative_and_default_cap_escalates(self) -> None:
        self.record("spec", status="fail", ok=False)
        self.record("spec")
        self.record("quality", status="fail", ok=False)
        self.record("quality")
        self.task_gate(ok=True)
        capped = self.record("spec", status="fail", ok=False)
        self.assertIn("escalat", json.dumps(capped).lower(), capped)
        history = self.history()["history"]
        self.assertEqual(sum(entry["status"] == "fail" for entry in history), 3)
        self.assertEqual(history[-1]["status"], "fail")
        self.task_gate(ok=False)
        for stage in ("spec", "quality", "spec"):
            self.record(stage, author="new-implementer", reviewer="new-reviewer", ok=False)
            self.task_gate(ok=False)
        self.assertEqual(self.history()["history"], history)

    def test_configured_review_round_cap_cannot_be_bypassed_by_success(self) -> None:
        self.write(self.root / "config.json", json.dumps({"max_review_rounds": 2}))
        self.record("spec", status="fail", ok=False)
        self.passing_pair()
        capped = self.record("quality", status="fail", ok=False)
        self.assertIn("escalat", json.dumps(capped).lower(), capped)
        before = self.history()
        self.record("spec", ok=False)
        self.record("quality", ok=False)
        self.assertEqual(self.history(), before)
        self.task_gate(ok=False)


class ReviewIntegrity(GateFixture):
    def test_invalid_json_and_top_level_schema_fail_without_resetting_history(self) -> None:
        self.passing_pair()
        valid = self.history()
        bad_documents = [
            "{not-json", "null", "[]", '"text"', "1", "{}",
            json.dumps({**valid, "schema_version": 2}),
            json.dumps({**valid, "schema_version": "1"}),
            json.dumps({**valid, "schema_version": True}),
            json.dumps({**valid, "task": "REQ-2/TASK-1"}),
            json.dumps({**valid, "task": None}),
            json.dumps({**valid, "history": {}}),
            json.dumps({**valid, "history": None}),
            json.dumps({**valid, "history": []}),
            json.dumps({key: value for key, value in valid.items() if key != "schema_version"}),
        ]
        for raw in bad_documents:
            with self.subTest(raw=raw[:100]):
                self.write(self.review_path(), raw)
                self.task_gate(ok=False)
                before = self.review_path().read_bytes()
                self.record("quality", ok=False)
                self.assertEqual(self.review_path().read_bytes(), before)

    def test_malformed_history_entry_fields_fail_closed(self) -> None:
        self.passing_pair()
        valid = self.history()
        replacements = {
            "sequence": (None, "2", True, 0),
            "stage": (None, [], "other"),
            "status": (None, True, "approved"),
            "author": (None, [], ""),
            "reviewer": (None, {}, ""),
            "recorded_at": (None, 123, ""),
            "evidence": (None, [], {}, {"path": "logs/quality.log", "sha256": 1}),
            "source_hashes": (None, [], {}, {"src/app.py": 1}),
            "contract": (None, [], {}, {"req": [], "task": {}}),
            "contract_fingerprint": (None, [], "not-a-hash"),
            "spec_review": (None, [], "not-a-hash"),
            "previous_hash": (None, [], "not-a-hash"),
            "record_hash": (None, [], "not-a-hash"),
        }
        for field, values in replacements.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    document = copy.deepcopy(valid)
                    document["history"][-1][field] = value
                    self.write_history(document)
                    self.task_gate(ok=False)
        for malformed in (None, "entry", [], 7, {}):
            with self.subTest(entry=malformed):
                document = copy.deepcopy(valid)
                document["history"][-1] = malformed
                self.write_history(document)
                self.task_gate(ok=False)
        for field in replacements:
            with self.subTest(missing=field):
                document = copy.deepcopy(valid)
                del document["history"][-1][field]
                self.write_history(document)
                self.task_gate(ok=False)

    def test_hash_chain_detects_tamper_even_in_superseded_reviews(self) -> None:
        self.passing_pair()
        self.passing_pair()
        valid = self.history()
        mutations = {
            "sequence": 7,
            "stage": "quality",
            "status": "fail",
            "author": "someone-else",
            "reviewer": "someone-else",
            "recorded_at": "2099-01-01T00:00:00+00:00",
            "evidence": {"path": "logs/quality.log", "sha256": "0" * 64},
            "source_hashes": {"src/other.py": "0" * 64},
            "contract": {"req": {"path": "wrong.md", "sha256": "0" * 64}, "task": {}},
            "contract_fingerprint": "0" * 64,
            "spec_review": "0" * 64,
            "previous_hash": "0" * 64,
            "record_hash": "0" * 64,
        }
        for field, value in mutations.items():
            with self.subTest(field=field):
                document = copy.deepcopy(valid)
                document["history"][0][field] = value
                self.write_history(document)
                self.task_gate(ok=False)
                before = self.review_path().read_bytes()
                self.record("quality", ok=False)
                self.assertEqual(self.review_path().read_bytes(), before)

    def test_history_reorder_deletion_duplication_and_old_spec_pointer_fail(self) -> None:
        self.passing_pair()
        self.passing_pair()
        valid = self.history()
        for operation in ("swap", "delete-middle", "duplicate", "old-spec-pointer"):
            with self.subTest(operation=operation):
                document = copy.deepcopy(valid)
                history = document["history"]
                if operation == "swap":
                    history[0], history[1] = history[1], history[0]
                elif operation == "delete-middle":
                    del history[1]
                elif operation == "duplicate":
                    history.insert(1, copy.deepcopy(history[0]))
                else:
                    history[-1]["spec_review"] = history[0]["record_hash"]
                self.write_history(document)
                self.task_gate(ok=False)

    def test_changes_to_each_source_or_evidence_file_invalidate_reviews(self) -> None:
        self.passing_pair(files=("src/app.py", "src/other.py"))
        for relative in ("src/app.py", "src/other.py", "logs/spec.log", "logs/quality.log"):
            path = self.repo / relative
            original = path.read_bytes()
            with self.subTest(path=relative, mutation="edit"):
                path.write_bytes(original + b"\nchanged\n")
                self.task_gate(ok=False)
                path.write_bytes(original)
                self.task_gate(ok=True)
            with self.subTest(path=relative, mutation="missing"):
                path.unlink()
                self.task_gate(ok=False)
                path.write_bytes(original)
            with self.subTest(path=relative, mutation="directory"):
                path.unlink()
                path.mkdir()
                self.task_gate(ok=False)
                path.rmdir()
                path.write_bytes(original)

    def test_only_frontmatter_status_and_updated_are_ignored(self) -> None:
        self.passing_pair()
        for path in (self.req, self.task):
            self.frontmatter(path, status="done", updated="2026-09-19")
            self.task_gate(ok=True)
        self.record("spec")
        fingerprints = [entry["contract_fingerprint"] for entry in self.history()["history"]]
        self.assertEqual(len(set(fingerprints)), 1)

    def test_every_other_req_or_task_edit_invalidates_contract(self) -> None:
        self.passing_pair()
        for path in (self.req, self.task):
            original = path.read_text(encoding="utf-8")
            edits = {
                "title": original.replace("title: ", "title: Changed ", 1),
                "created": original.replace("created: 2026-01-01", "created: 2026-01-02", 1),
                "frontmatter-status-like-key": original.replace("audit_status: original", "audit_status: changed", 1),
                "frontmatter-updated-like-key": original.replace("audit_updated: original", "audit_updated: changed", 1),
                "body-status": original.replace("status: body text", "status: revised text", 1),
                "body-updated": original.replace("updated: body text", "updated: revised text", 1),
                "body-whitespace": original + "\n",
                "body-text": original + "\nNew contractual requirement.\n",
                "frontmatter-comment": original.replace("---\n", "---\n# New contractual note\n", 1),
            }
            for label, changed in edits.items():
                with self.subTest(path=path.name, edit=label):
                    self.write(path, changed)
                    self.task_gate(ok=False)
                    self.write(path, original)
                    self.task_gate(ok=True)
        self.frontmatter(self.req, readiness=5)
        self.task_gate(ok=False)


class ReviewPathSafety(GateFixture):
    def test_source_and_evidence_must_be_nonempty_existing_repo_relative_files(self) -> None:
        outside = self.write(self.workspace / "outside.log", "Outside this repo, inside the test workspace.\n")
        for field in ("files", "evidence"):
            valid = "src/app.py" if field == "files" else "logs/spec.log"
            for candidate in (
                "", " ", "missing.file", "src", str(self.repo / valid),
                "../outside.log", "..\\outside.log", str(outside),
                "src/../src/app.py", "logs/../../outside.log",
            ):
                with self.subTest(field=field, path=candidate):
                    kwargs = {"files": (candidate,)} if field == "files" else {"evidence": candidate}
                    self.record(ok=False, **kwargs)
                    self.task_gate(ok=False)
        self.passing_pair()
        self.task_gate(ok=True)

    def test_empty_file_scope_is_rejected_by_parser_or_command(self) -> None:
        parser = argparse.ArgumentParser()
        gates.register(parser.add_subparsers(dest="command", required=True))
        stdout, stderr = io.StringIO(), io.StringIO()
        before = self.snapshot()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            try:
                args = parser.parse_args([
                    "review-record", "--task", self.selector, "--stage", "spec",
                    "--status", "pass", "--author", "implementer",
                    "--reviewer", "spec-reviewer", "--evidence", "logs/spec.log",
                    "--files", "--repo", str(self.repo), "--root", "docs/plan", "--json",
                ])
            except SystemExit as exc:
                self.assertNotEqual(exc.code, 0)
            else:
                self.assertNotEqual(args.func(args), 0)
                self.assertIs(json.loads(stdout.getvalue())["ok"], False)
        self.assertEqual(self.snapshot(), before)

    def test_one_invalid_file_cannot_hide_in_an_otherwise_valid_scope(self) -> None:
        self.record(files=("src/app.py", "missing.py"), ok=False)
        self.record(files=("src/app.py", ""), ok=False)
        self.task_gate(ok=False)

    def symlink(self, link: Path, target: Path, *, directory: bool = False) -> None:
        try:
            link.symlink_to(target, target_is_directory=directory)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"Symlink creation unavailable on this host: {exc}")

    def test_source_symlink_escape_is_rejected(self) -> None:
        target = self.write(self.workspace / "outside.py", "VALUE = 1\n")
        self.symlink(self.repo / "src" / "linked.py", target)
        self.record(files=("src/linked.py",), ok=False)

    def test_evidence_symlink_escape_is_rejected(self) -> None:
        target = self.write(self.workspace / "outside.log", "Evidence outside the repo.\n")
        self.symlink(self.repo / "logs" / "linked.log", target)
        self.record(evidence="logs/linked.log", ok=False)

    def test_symlinked_parent_directory_cannot_escape(self) -> None:
        outside = self.workspace / "outside"
        self.write(outside / "app.py", "VALUE = 1\n")
        self.write(outside / "spec.log", "Evidence outside the repo.\n")
        self.symlink(self.repo / "linked", outside, directory=True)
        self.record(files=("linked/app.py",), ok=False)
        self.record(evidence="linked/spec.log", ok=False)

    def test_post_review_symlink_escape_fails_even_with_identical_bytes(self) -> None:
        self.passing_pair()
        for relative in ("src/app.py", "logs/spec.log", "logs/quality.log"):
            with self.subTest(path=relative):
                path = self.repo / relative
                original = path.read_bytes()
                outside = self.workspace / path.name
                outside.write_bytes(original)
                path.unlink()
                self.symlink(path, outside)
                self.task_gate(ok=False)
                path.unlink()
                path.write_bytes(original)

    @unittest.skipUnless(os.name == "nt", "Windows directory junction regression")
    def test_windows_junction_with_uppercase_markdown_cannot_escape_plan_root(self) -> None:
        self.passing_pair()
        self.task_gate(phase="load", ok=True)
        self.task_gate(ok=True)
        target = self.workspace / "junction-target"
        escaped = self.write(target / "UPPERCASE.MD", "# Outside the repository\n")
        original = escaped.read_bytes()
        junction = self.root / "junction-escape"
        try:
            proc = subprocess.run(
                ["cmd.exe", "/d", "/c", "mklink", "/J", str(junction), str(target)],
                cwd=self.repo,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=30,
            )
        except FileNotFoundError as exc:
            self.skipTest(f"Windows junction creation unavailable: {exc}")
        if proc.returncode != 0:
            self.skipTest(f"Windows junction creation unavailable: {proc.stdout}{proc.stderr}")
        try:
            self.assertFalse(junction.is_symlink())
            self.assertEqual(junction.resolve(), target.resolve())
            self.assertEqual((junction / escaped.name).suffix, ".MD")
            read_text = Path.read_text

            def contained_read(path: Path, *args, **kwargs):
                self.assertFalse(path.resolve().is_relative_to(target), "escaped Markdown was read")
                return read_text(path, *args, **kwargs)

            with mock.patch.object(Path, "read_text", autospec=True, side_effect=contained_read):
                self.task_gate(phase="load", ok=False)
                self.task_gate(ok=False)
        finally:
            # Windows rmdir removes only the junction, never its target tree.
            junction.rmdir()
        self.assertFalse(junction.exists())
        self.assertEqual(escaped.read_bytes(), original)


class ChangeGates(GateFixture):
    def test_active_change_resolves_by_id_or_slug_when_all_work_is_done_and_fresh(self) -> None:
        self.passing_pair()
        self.done()
        self.change_gate("CHANGE-1", ok=True)
        self.change_gate("verified-work", ok=True)

    def test_missing_unlinked_or_empty_change_cannot_archive(self) -> None:
        self.passing_pair()
        self.done()
        for reqs in ("[]", "[REQ-99]"):
            with self.subTest(reqs=reqs):
                self.frontmatter(self.change, reqs=reqs)
                self.change_gate(ok=False)
        self.frontmatter(self.change, reqs="[]", skip_specs="true")
        self.change_gate(ok=False)
        self.frontmatter(self.change, reqs="[REQ-1]", skip_specs="false")
        for reciprocal in (None, "", "CHANGE-2"):
            with self.subTest(change=reciprocal):
                self.frontmatter(self.req, change=reciprocal)
                self.passing_pair()
                self.task_gate(ok=True)
                self.change_gate(ok=False)

    def test_unknown_or_archived_changes_are_not_active(self) -> None:
        self.passing_pair()
        self.done()
        for selector in ("CHANGE-99", "unknown-slug", "../verified-work", "/verified-work"):
            with self.subTest(selector=selector):
                self.change_gate(selector, ok=False)
        self.frontmatter(self.change, status="archived")
        self.change_gate(ok=False)
        self.frontmatter(self.change, status="verifying")
        archived = self.root / "changes" / "archive" / "2026-01-01-verified-work"
        archived.parent.mkdir(parents=True)
        self.change.parent.rename(archived)
        self.change_gate("CHANGE-1", ok=False)
        self.change_gate("verified-work", ok=False)

    def test_missing_tasks_or_incomplete_parent_or_task_block_change(self) -> None:
        self.passing_pair()
        self.done()
        for path, status in ((self.req, "ready"), (self.task, "ready")):
            with self.subTest(path=path.name):
                self.frontmatter(path, status=status)
                self.change_gate(ok=False)
                self.frontmatter(path, status="done")
        self.task.unlink()
        self.change_gate(ok=False)

    def test_all_linked_reqs_and_all_their_tasks_need_fresh_reviews(self) -> None:
        self.passing_pair()
        self.done()
        second = self.requirement("REQ-2", status="done")
        self.frontmatter(self.change, reqs="[REQ-1, REQ-2]")
        self.change_gate(ok=False)
        self.task_file("REQ-2", status="done")
        self.change_gate(ok=False)
        self.passing_pair("REQ-2/TASK-1")
        self.change_gate(ok=True)
        extra = self.task_file(task_id="TASK-2", status="done")
        self.change_gate(ok=False)
        self.passing_pair("REQ-1/TASK-2")
        self.change_gate(ok=True)
        for path in (second, extra):
            original = path.read_text(encoding="utf-8")
            self.write(path, original + "\nChanged acceptance criteria.\n")
            self.change_gate(ok=False)
            self.write(path, original)
        self.write(self.repo / "logs" / "quality.log", "Different evidence.\n")
        self.change_gate(ok=False)


class PlanGateIntegration(GateFixture):
    def test_apply_status_rejects_unbracketed_task_blockers(self) -> None:
        self.task_file(task_id="TASK-2", status="done", blocks="[TASK-1]")
        self.frontmatter(self.task, blocked_by="[TASK-2]")
        self.assertEqual(self.ready_to_load(), ["TASK-1"])
        for status in ("planned", "ready"):
            with self.subTest(status=status):
                self.frontmatter(self.task, status=status, blocked_by="TASK-2")
                self.task_gate(phase="load", ok=False)
                self.assertEqual(self.ready_to_load(), [])

    def test_apply_status_never_lists_task_zero(self) -> None:
        invalid = self.task_file(task_id="TASK-0")
        for status in ("planned", "ready"):
            with self.subTest(status=status):
                self.frontmatter(invalid, status=status)
                self.task_gate(selector="REQ-1/TASK-0", phase="load", ok=False)
                self.assertEqual(self.ready_to_load(), ["TASK-1"])

    def test_archive_rejects_traversal_delta_domains_without_mutation(self) -> None:
        self.passing_pair()
        self.done()
        self.change_gate(ok=True)
        delta = (self.change.parent / "deltas" / "app.md").read_text(encoding="utf-8")
        for domain in ("../outside", "../../outside", "app/../outside"):
            with self.subTest(domain=domain):
                delta_path = (self.change.parent / "deltas" / f"{domain}.md").resolve()
                self.assertTrue(delta_path.is_relative_to(self.workspace))
                self.write(delta_path, delta)
                self.frontmatter(self.change, deltas=f"[{domain}]")
                self.task_gate(ok=True)
                self.change_gate(ok=False)
                for flags in (("--move",), ("--dry-run",)):
                    before = self.snapshot()
                    proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", *flags)
                    self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                    self.assertEqual(self.snapshot(), before)

    def test_archive_rejects_malformed_change_slug_without_mutation(self) -> None:
        self.passing_pair()
        self.done()
        self.change_gate(ok=True)
        for slug in ("../escaped", "Bad_Slug", "with space", "..\\escaped"):
            with self.subTest(slug=slug):
                self.frontmatter(self.change, slug=slug)
                self.task_gate(ok=True)
                self.change_gate(ok=False)
                for flags in (("--move",), ("--dry-run",)):
                    before = self.snapshot()
                    proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", *flags)
                    self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                    self.assertEqual(self.snapshot(), before)

    def test_archive_rejects_lost_or_foreign_task_frontmatter_in_linked_directory(self) -> None:
        self.passing_pair()
        self.done()
        self.requirement("REQ-2", status="done", change="")
        self.change_gate(ok=True)
        extra = self.task_file(task_id="TASK-2", status="done")
        original = extra.read_text(encoding="utf-8")
        variants = (
            ("no-frontmatter", None),
            ("missing-id", {"id": None}),
            ("missing-req", {"req": None}),
            ("foreign-req", {"req": "REQ-2"}),
            ("foreign-kind", {"id": "REQ-3"}),
        )
        for label, updates in variants:
            with self.subTest(identity=label):
                self.write(extra, original)
                if updates is None:
                    self.write(extra, "# TASK-2\nThe frontmatter was lost.\n")
                else:
                    self.frontmatter(extra, **updates)
                self.task_gate(ok=True)
                self.change_gate(ok=False)
                for flags in (("--move",), ("--dry-run",)):
                    before = self.snapshot()
                    proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", *flags)
                    self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                    self.assertEqual(self.snapshot(), before)
        extra.unlink()
        self.change_gate(ok=True)

    def test_archive_target_collision_preserves_truth_with_fresh_completed_reviews(self) -> None:
        self.passing_pair()
        self.done()
        destination = self.root / "changes" / "archive" / f"{date.today().isoformat()}-verified-work"
        self.write(destination / "sentinel.txt", "Existing archive must not change.\n")
        self.change_gate(ok=True)
        truth = self.truth.read_bytes()
        for flags in ((), ("--dry-run",)):
            with self.subTest(flags=flags):
                before = self.snapshot()
                proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", "--move", *flags)
                self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                self.assertIn("archive target exists", proc.stdout + proc.stderr)
                self.assertEqual(self.truth.read_bytes(), truth)
                self.assertEqual(self.snapshot(), before)

    def test_configured_archive_rejects_missing_reviews_without_any_mutation(self) -> None:
        self.done()
        for flags in ((), ("--move",), ("--dry-run",), ("--dry-run", "--move")):
            with self.subTest(flags=flags):
                before = self.snapshot()
                proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", *flags)
                self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                self.assertEqual(self.snapshot(), before)

    def test_archive_calls_evidence_gate_before_merge_even_in_dry_run(self) -> None:
        self.done()
        for dry_run in (False, True):
            with self.subTest(dry_run=dry_run):
                args = argparse.Namespace(root=str(self.root), change="CHANGE-1", dry_run=dry_run, move=True)
                previous = Path.cwd()
                try:
                    os.chdir(self.repo)
                    with mock.patch.object(merge_deltas, "merge_change") as merge:
                        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                            code = plan_cli.cmd_archive(args)
                        self.assertNotEqual(code, 0)
                        merge.assert_not_called()
                finally:
                    os.chdir(previous)

    def test_configured_archive_rejects_stale_evidence_before_merge(self) -> None:
        self.passing_pair()
        self.done()
        self.write(self.repo / "src" / "app.py", "VALUE = 99\n")
        before = self.snapshot()
        proc = self.plan("archive", "--root", "docs/plan", "--change", "verified-work", "--move")
        self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertEqual(self.snapshot(), before)

    def test_verified_dry_run_passes_and_leaves_everything_untouched(self) -> None:
        self.passing_pair()
        self.done()
        before = self.snapshot()
        proc = self.plan("archive", "--root", "docs/plan", "--change", "verified-work", "--dry-run", "--move")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertEqual(self.snapshot(), before)

    def test_verified_archive_merges_moves_and_updates_index(self) -> None:
        self.passing_pair()
        self.done()
        original_index = (self.root / "INDEX.md").read_bytes()
        proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", "--move")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        truth = self.truth.read_text(encoding="utf-8")
        self.assertIn("### Requirement: Existing work", truth)
        self.assertIn("### Requirement: Verified work", truth)
        self.assertFalse(self.change.exists())
        archived = list((self.root / "changes" / "archive").glob("*/CHANGE.md"))
        self.assertEqual(len(archived), 1)
        self.assertIn("status: archived", archived[0].read_text(encoding="utf-8"))
        self.assertNotEqual((self.root / "INDEX.md").read_bytes(), original_index)

    def test_configured_archive_root_must_be_within_cwd_repository(self) -> None:
        self.passing_pair()
        self.done()
        other_repo = self.workspace / "other-repo"
        other_repo.mkdir()
        for flags in (("--move",), ("--dry-run",)):
            with self.subTest(flags=flags):
                before = self.snapshot()
                proc = self.plan("archive", "--root", str(self.root), "--change", "CHANGE-1", *flags, cwd=other_repo)
                self.assertNotEqual(proc.returncode, 0, proc.stdout + proc.stderr)
                self.assertEqual(self.snapshot(), before)

    def test_legacy_root_without_config_keeps_ungated_merge_behavior(self) -> None:
        (self.root / "config.json").unlink()
        before = self.snapshot()
        dry = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1", "--dry-run")
        self.assertEqual(dry.returncode, 0, dry.stdout + dry.stderr)
        self.assertEqual(self.snapshot(), before)
        proc = self.plan("archive", "--root", "docs/plan", "--change", "CHANGE-1")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("### Requirement: Verified work", self.truth.read_text(encoding="utf-8"))
        self.assertTrue(self.change.exists())

    def test_apply_status_excludes_tasks_with_unmet_req_blockers(self) -> None:
        self.assertEqual(self.ready_to_load(), ["TASK-1"])
        self.frontmatter(self.req, blocked_by="[REQ-2]")
        self.assertEqual(self.ready_to_load(), [])
        blocker = self.requirement("REQ-2", blocks="[REQ-1]", change="")
        self.assertEqual(self.ready_to_load(), [])
        self.frontmatter(blocker, status="done")
        self.assertEqual(self.ready_to_load(), ["TASK-1"])

    def test_apply_status_excludes_tasks_under_cancelled_done_or_missing_parent(self) -> None:
        for status in ("cancelled", "done", "blocked", "invalid"):
            with self.subTest(status=status):
                self.frontmatter(self.req, status=status)
                self.assertEqual(self.ready_to_load(), [])
        self.req.unlink()
        self.assertEqual(self.ready_to_load(), [])

    def test_apply_status_scopes_task_dependencies_to_their_req(self) -> None:
        self.frontmatter(self.task, blocks="[TASK-2]")
        self.task_file(task_id="TASK-2", blocked_by="[TASK-1]")
        self.requirement("REQ-2", status="done", change="")
        self.task_file("REQ-2", status="done")
        self.assertEqual(self.ready_to_load(), ["TASK-1"])
        self.frontmatter(self.task, status="done")
        self.assertEqual(self.ready_to_load(), ["TASK-2"])
        self.task.unlink()
        self.assertEqual(self.ready_to_load(), [])


if __name__ == "__main__":
    unittest.main()
