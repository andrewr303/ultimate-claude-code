"""Stdlib tests for scripts/validate_plan.py."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "validate_plan", ROOT / "scripts" / "validate_plan.py"
)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class ParseList(unittest.TestCase):
    def test_empty(self) -> None:
        self.assertEqual(mod.parse_list(""), [])
        self.assertEqual(mod.parse_list("[]"), [])

    def test_ids(self) -> None:
        self.assertEqual(mod.parse_list("[REQ-1, REQ-2]"), ["REQ-1", "REQ-2"])


class Cycle(unittest.TestCase):
    def test_detects(self) -> None:
        hit = mod.has_cycle({"A": ["B"], "B": ["A"]})
        self.assertIsNotNone(hit)

    def test_chain_ok(self) -> None:
        self.assertIsNone(mod.has_cycle({"A": ["B"], "B": ["C"]}))


class ExampleTree(unittest.TestCase):
    def test_launchpad_valid(self) -> None:
        artifacts = mod.collect(ROOT / "examples" / "launchpad")
        ids = [fm["id"] for _, fm in artifacts]
        self.assertIn("REQ-1", ids)
        self.assertIn("EPIC-1", ids)
        self.assertEqual(len(ids), len(set(ids)))

    def test_openspec_change_valid(self) -> None:
        import sys

        argv = sys.argv
        sys.argv = [
            "validate_plan.py",
            "--root",
            str(ROOT / "examples" / "openspec-change"),
        ]
        try:
            self.assertEqual(mod.main(), 0)
        finally:
            sys.argv = argv


class InitThenValidate(unittest.TestCase):
    def test_fresh_tree(self) -> None:
        init_spec = importlib.util.spec_from_file_location(
            "init_plan", ROOT / "scripts" / "init_plan.py"
        )
        init = importlib.util.module_from_spec(init_spec)
        assert init_spec and init_spec.loader
        init_spec.loader.exec_module(init)
        with tempfile.TemporaryDirectory() as tmp:
            # call through main argv
            import sys

            argv = sys.argv
            sys.argv = ["init_plan.py", "--root", tmp, "--title", "T"]
            try:
                self.assertEqual(init.main(), 0)
            finally:
                sys.argv = argv
            artifacts = mod.collect(Path(tmp))
            self.assertTrue(any(fm.get("id") == "PROJECT" for _, fm in artifacts))


if __name__ == "__main__":
    unittest.main()
