"""Tests for the plan harness CLI and planlib."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from planlib.classify import classify  # noqa: E402
from planlib.graph import next_action  # noqa: E402
from planlib.parse import collect  # noqa: E402
from planlib.pipelines import list_pipelines, load_pipeline  # noqa: E402


def plan(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPTS / "plan.py"), *args],
        cwd=cwd or ROOT,
        capture_output=True,
        text=True,
    )


class Classify(unittest.TestCase):
    def test_bug(self) -> None:
        hit = classify("fix the login crash")
        self.assertEqual(hit["pipeline"], "bug-fix")
        self.assertEqual(hit["basis"], "keyword")
        self.assertIn("crash", hit["matched"])

    def test_default(self) -> None:
        hit = classify("add a settings toggle")
        self.assertEqual(hit["pipeline"], "small-feature")
        self.assertEqual(hit["basis"], "default")

    def test_goal_measure(self) -> None:
        self.assertEqual(classify("get lighthouse to 90")["pipeline"], "goal-measure")


class Pipelines(unittest.TestCase):
    def test_seven_ship(self) -> None:
        names = {p["name"] for p in list_pipelines()}
        self.assertGreaterEqual(len(names), 7)
        self.assertIn("small-feature", names)
        self.assertIn("full-feature", names)

    def test_load_validates_requires(self) -> None:
        spec = load_pipeline("small-feature")
        self.assertEqual(spec["stages"][0]["id"], "propose")
        with self.assertRaises(FileNotFoundError):
            load_pipeline("not-a-real-pipeline")


class NextAction(unittest.TestCase):
    def test_launchpad_specify(self) -> None:
        root = ROOT / "examples" / "launchpad"
        nxt = next_action(root, collect(root))
        self.assertEqual(nxt["action"], "specify")
        self.assertIn("REQ-1", nxt["target"])

    def test_openspec_change_has_next(self) -> None:
        root = ROOT / "examples" / "openspec-change"
        nxt = next_action(root, collect(root))
        self.assertIn(nxt["action"], {"frame", "explode", "project"})


class Cli(unittest.TestCase):
    def test_doctor(self) -> None:
        proc = plan("doctor", "--json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        data = json.loads(proc.stdout)
        self.assertTrue(data["ok"], data)

    def test_classify_cli(self) -> None:
        proc = plan("classify", "fix the crash", "--json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(json.loads(proc.stdout)["pipeline"], "bug-fix")

    def test_status_launchpad(self) -> None:
        proc = plan("status", "--root", str(ROOT / "examples" / "launchpad"), "--json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        data = json.loads(proc.stdout)
        self.assertGreaterEqual(data["reqs"], 3)
        self.assertEqual(data["next"]["action"], "specify")

    def test_validate_examples(self) -> None:
        for name in ("launchpad", "openspec-change"):
            proc = plan("validate", "--root", str(ROOT / "examples" / name))
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_pipeline_list(self) -> None:
        proc = plan("pipeline", "list", "--json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        names = {row["name"] for row in json.loads(proc.stdout)}
        self.assertIn("bug-fix", names)

    def test_run_gates_pause(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "INDEX.md").write_text("# t\n", encoding="utf-8")
            start = plan(
                "run",
                "start",
                "--root",
                str(root),
                "--pipeline",
                "small-feature",
                "--json",
            )
            self.assertEqual(start.returncode, 0, start.stderr)
            paused = plan("run", "advance", "--root", str(root), "--json")
            self.assertEqual(paused.returncode, 0, paused.stderr)
            data = json.loads(paused.stdout)
            self.assertEqual(data["status"], "paused")
            self.assertEqual(data["stage"], "propose")
            advanced = plan(
                "run", "advance", "--root", str(root), "--approve", "--json"
            )
            self.assertEqual(advanced.returncode, 0, advanced.stderr)
            data = json.loads(advanced.stdout)
            self.assertEqual(data["stage"], "apply")
            self.assertIn("propose", data["completed"])

    def test_propose_scaffold_and_decompose(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            init = plan("init", "--root", str(root), "--title", "T")
            self.assertEqual(init.returncode, 0, init.stderr)
            sc = plan(
                "propose-scaffold",
                "--root",
                str(root),
                "--title",
                "Add countdown",
                "--slug",
                "add-countdown",
                "--deltas",
                "launches",
            )
            self.assertEqual(sc.returncode, 0, sc.stderr)
            self.assertTrue((root / "changes" / "add-countdown" / "CHANGE.md").exists())
            dec = plan(
                "decompose",
                "--root",
                str(root),
                "--change",
                "add-countdown",
                "--json",
            )
            self.assertEqual(dec.returncode, 0, dec.stderr)
            data = json.loads(dec.stdout)
            self.assertGreaterEqual(len(data["children"]), 1)

    def test_handoff_write(self) -> None:
        proc = plan(
            "handoff",
            "--root",
            str(ROOT / "examples" / "launchpad"),
            "--write",
            "--out",
            str(ROOT / "examples" / "launchpad" / "HANDOFF.md"),
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        text = (ROOT / "examples" / "launchpad" / "HANDOFF.md").read_text(encoding="utf-8")
        self.assertIn("REQ-1", text)
        (ROOT / "examples" / "launchpad" / "HANDOFF.md").unlink()


if __name__ == "__main__":
    unittest.main()
