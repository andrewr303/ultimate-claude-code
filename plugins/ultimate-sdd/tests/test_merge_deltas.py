"""Stdlib tests for scripts/merge_deltas.py."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "merge_deltas", ROOT / "scripts" / "merge_deltas.py"
)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


ADDED = """## Purpose
Upcoming launches list.

## ADDED Requirements

### Requirement: Upcoming List
The system SHALL list upcoming launches with name and net time.

#### Scenario: Has launches
- WHEN the list loads
- THEN each row shows name and net
"""

MODIFIED = """## MODIFIED Requirements

### Requirement: Upcoming List
The system SHALL list upcoming launches with name, net time, and a countdown.

#### Scenario: Countdown
- GIVEN a launch 90 minutes ahead
- WHEN the list renders
- THEN the row shows T-01:30:00
"""

REMOVED = """## REMOVED Requirements

### Requirement: Upcoming List
(Replaced by a calendar view.)
"""


class ApplyDelta(unittest.TestCase):
    def test_create_from_added(self) -> None:
        text, log = mod.apply_delta(None, ADDED, domain="launches")
        self.assertIsNotNone(text)
        assert text is not None
        self.assertIn("### Requirement: Upcoming List", text)
        self.assertIn("created truth spec", log[0])

    def test_modified_replaces(self) -> None:
        main, _ = mod.apply_delta(None, ADDED, domain="launches")
        assert main is not None
        # sibling requirement must survive a MODIFIED of a neighbor
        sibling = (
            main.rstrip()
            + "\n\n### Requirement: Location Filter\n"
            + "The system SHALL filter by location__ids.\n"
        )
        text, log = mod.apply_delta(sibling, MODIFIED, domain="launches")
        assert text is not None
        self.assertIn("countdown", text)
        self.assertIn("### Requirement: Location Filter", text)
        self.assertNotIn("The system SHALL list upcoming launches with name and net time.", text)
        self.assertTrue(any("MODIFIED" in line for line in log))

    def test_added_existing_errors(self) -> None:
        main, _ = mod.apply_delta(None, ADDED, domain="launches")
        with self.assertRaises(mod.MergeError):
            mod.apply_delta(main, ADDED, domain="launches")

    def test_modified_missing_errors(self) -> None:
        with self.assertRaises(mod.MergeError):
            mod.apply_delta(None, MODIFIED, domain="launches")

    def test_remove_last_requires_retire(self) -> None:
        main, _ = mod.apply_delta(None, ADDED, domain="launches")
        with self.assertRaises(mod.MergeError) as ctx:
            mod.apply_delta(main, REMOVED, domain="launches", retire=False)
        self.assertIn("retire_capabilities", str(ctx.exception))

    def test_retire_deletes(self) -> None:
        main, _ = mod.apply_delta(None, ADDED, domain="launches")
        text, log = mod.apply_delta(main, REMOVED, domain="launches", retire=True)
        self.assertIsNone(text)
        self.assertTrue(any("retired" in line for line in log))


class MergeChangeTree(unittest.TestCase):
    def test_example_dry_run(self) -> None:
        logs = mod.merge_change(
            ROOT / "examples" / "openspec-change",
            "add-launch-countdown",
            dry_run=True,
        )
        self.assertTrue(any("ADDED" in line or "MODIFIED" in line for line in logs))
        self.assertTrue(any("dry-run" in line for line in logs))

    def test_skip_specs_is_noop(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            change = root / "changes" / "chore-rename"
            change.mkdir(parents=True)
            (change / "CHANGE.md").write_text(
                (
                    "---\n"
                    "id: CHANGE-2\n"
                    "title: Rename a private helper\n"
                    "slug: chore-rename\n"
                    "status: proposed\n"
                    "reqs: []\n"
                    "deltas: []\n"
                    "skip_specs: true\n"
                    "retire_capabilities: false\n"
                    "---\n"
                ),
                encoding="utf-8",
            )
            logs = mod.merge_change(root, "CHANGE-2")
            self.assertTrue(any("skip_specs" in line for line in logs))
            self.assertFalse((root / "truth").exists())

    def test_writes_truth(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            change = root / "changes" / "add-launch-countdown"
            (change / "deltas").mkdir(parents=True)
            (change / "CHANGE.md").write_text(
                (
                    "---\n"
                    "id: CHANGE-1\n"
                    "title: Countdown\n"
                    "slug: add-launch-countdown\n"
                    "status: proposed\n"
                    "reqs: []\n"
                    "deltas: [launches]\n"
                    "skip_specs: false\n"
                    "retire_capabilities: false\n"
                    "---\n"
                ),
                encoding="utf-8",
            )
            (change / "deltas" / "launches.md").write_text(ADDED, encoding="utf-8")
            logs = mod.merge_change(root, "CHANGE-1")
            truth = root / "truth" / "launches" / "spec.md"
            self.assertTrue(truth.exists(), logs)
            self.assertIn("Upcoming List", truth.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
