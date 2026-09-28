"""Setup and policy tests, independent of sibling extension registration."""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import sdd  # noqa: E402
from sddlib import config  # noqa: E402


def config_parser() -> argparse.ArgumentParser:
    parser = sdd.ArgumentParser(allow_abbrev=False)
    config.register(parser.add_subparsers(dest="command", required=True))
    return parser


class Workspace(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix=".test-sdd-config-", dir=ROOT)
        self.addCleanup(self.temporary.cleanup)
        self.workspace = Path(self.temporary.name)
        self.repo = self.workspace / "repo"
        self.repo.mkdir()
        self.root = self.repo / "docs" / "plan"

    def write(self, name: str, text: str) -> Path:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def write_config(self, data: object) -> Path:
        return self.write("config.json", json.dumps(data))

    def command(self, name: str, *flags: str) -> tuple[int, dict]:
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.object(sdd, "build_parser", side_effect=config_parser):
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = sdd.main([name, "--repo", str(self.repo), *flags, "--json"])
        self.assertEqual(stderr.getvalue(), "")
        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload["ok"], code == 0, payload)
        if code:
            self.assertTrue(payload["errors"], payload)
        return code, payload

    def snapshot(self) -> dict[str, tuple[bytes, int]]:
        return {str(p.relative_to(self.repo)): (p.read_bytes(), p.stat().st_mtime_ns)
                for p in self.repo.rglob("*") if p.is_file()}

    def symlink(self, link: Path, target: Path, directory: bool = False) -> None:
        link.parent.mkdir(parents=True, exist_ok=True)
        try:
            link.symlink_to(target, target_is_directory=directory)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"Symbolic links unavailable: {exc}")


class ConfigTests(Workspace):
    def test_parser_defaults_and_handlers(self) -> None:
        for command in ("setup", "config", "doctor"):
            args = config_parser().parse_args([command])
            self.assertEqual((args.repo, args.root, args.json), (".", "docs/plan", False))
            self.assertTrue(callable(args.func))

    def test_defaults_are_independent(self) -> None:
        first = config.load_config(self.root)
        first["hooks"]["enabled"] = False
        first["test_commands"].append(["unexpected"])
        self.assertEqual(config.load_config(self.root), config.DEFAULTS)
        self.assertFalse(self.root.exists())

    def test_template_matches_effective_defaults(self) -> None:
        template = json.loads((ROOT / "templates" / "config-template.json").read_text(encoding="utf-8"))
        self.assertEqual(template, config.load_config(self.root))

    def test_partial_config_merges_only_missing_values(self) -> None:
        self.write_config({"execution_mode": "inline", "parallelism": "serial", "tdd": "off",
                           "max_review_rounds": 1, "hooks": {"enabled": False},
                           "test_commands": [["custom-test", "--exact", ""]]})
        loaded = config.load_config(self.root)
        self.assertEqual(loaded["schema_version"], 1)
        self.assertEqual(loaded["execution_mode"], "inline")
        self.assertEqual(loaded["parallelism"], "serial")
        self.assertEqual(loaded["tdd"], "off")
        self.assertEqual(loaded["max_review_rounds"], 1)
        self.assertFalse(loaded["hooks"]["enabled"])
        self.assertEqual(loaded["test_commands"], [["custom-test", "--exact", ""]])
        self.write_config({"hooks": {}})
        self.assertEqual(config.load_config(self.root)["hooks"], {"enabled": True})

    def test_rejects_non_object_and_unknown_settings(self) -> None:
        for data in (None, [], 1, "config", {"extra": True}, {"hooks": {"allow": True}}):
            with self.subTest(data=data):
                self.write_config(data)
                code, result = self.command("config")
                self.assertEqual(code, 1, result)

    def test_rejects_invalid_policy_values_without_type_errors(self) -> None:
        invalid = {
            "schema_version": [True, False, 1.0, 2, "1", None],
            "execution_mode": ["auto", [], {}, None, True],
            "parallelism": ["all", [], None],
            "tdd": [False, "optional", {}],
            "max_review_rounds": [True, False, 0, 6, 3.0, "3", None],
            "hooks": [None, True, [], {"enabled": 1}, {"enabled": "false"}, {"enabled": None}],
        }
        for key, values in invalid.items():
            for value in values:
                with self.subTest(key=key, value=value):
                    self.write_config({key: value})
                    code, result = self.command("config")
                    self.assertEqual(code, 1, result)
                    self.assertIn(key, result["errors"][0])

    def test_rejects_invalid_argv_forms(self) -> None:
        for value in (None, {}, "run-tests", ["run-tests"], [[]], [[""]], [["  "]],
                      [[1]], [["test", False]], [["test", None]], [["test", "line\nfeed"]],
                      [["test\x00"]], [["test", "\r"]]):
            with self.subTest(value=value):
                self.write_config({"test_commands": value})
                code, result = self.command("config")
                self.assertEqual(code, 1, result)
                self.assertIn("test_commands", result["errors"][0])

    def test_rejects_duplicate_keys_and_nonstandard_json(self) -> None:
        for text in ('{"tdd":"required","tdd":"off"}',
                     '{"hooks":{"enabled":true,"enabled":false}}',
                     '{"max_review_rounds":NaN}', '{"max_review_rounds":Infinity}', '{'):
            with self.subTest(text=text):
                self.write("config.json", text)
                code, result = self.command("config")
                self.assertEqual(code, 1, result)
                self.assertIn("Invalid configuration", result["errors"][0])

    def test_config_is_read_only_and_reports_defaults(self) -> None:
        code, result = self.command("config")
        self.assertEqual(code, 0, result)
        self.assertFalse(result["config_exists"])
        self.assertEqual(result["config"], config.DEFAULTS)
        self.assertFalse(self.root.exists())
        self.write_config({"hooks": {"enabled": False}})
        before = self.snapshot()
        code, result = self.command("config")
        self.assertEqual(code, 0, result)
        self.assertTrue(result["config_exists"])
        self.assertEqual(before, self.snapshot())

    def test_load_config_rejects_non_directory_root(self) -> None:
        root_file = self.repo / "not-a-directory"
        root_file.write_text("user content", encoding="utf-8")
        with self.assertRaises((ValueError, OSError)):
            config.load_config(root_file)

    def test_json_argument_errors_are_structured(self) -> None:
        for flags in (("--force",), ("--tit", "x"), ("--unknown",)):
            with self.subTest(flags=flags):
                code, result = self.command("setup", *flags)
                self.assertEqual(code, 1, result)
                self.assertIn("--help", result["errors"][0])

    def test_expected_entry_errors_are_structured(self) -> None:
        for error in (PermissionError("denied"), ValueError("malformed state"),
                      json.JSONDecodeError("bad JSON", "{", 1),
                      subprocess.TimeoutExpired("init", 60), RecursionError("state too deep")):
            with self.subTest(error=error):
                stdout = io.StringIO()
                with mock.patch.object(sdd, "build_parser", side_effect=error):
                    with contextlib.redirect_stdout(stdout):
                        self.assertEqual(sdd.main(["config", "--json"]), 1)
                self.assertFalse(json.loads(stdout.getvalue())["ok"])

    def test_import_errors_are_not_hidden(self) -> None:
        with mock.patch.object(sdd, "build_parser", side_effect=ImportError("missing sibling")):
            with self.assertRaises(ImportError):
                sdd.main(["config", "--json"])

    def test_non_json_error_has_no_traceback(self) -> None:
        stderr = io.StringIO()
        with mock.patch.object(sdd, "build_parser", side_effect=config_parser):
            with contextlib.redirect_stderr(stderr):
                self.assertEqual(sdd.main(["config", "--repo", str(self.repo / "missing")]), 1)
        self.assertIn("error:", stderr.getvalue())
        self.assertNotIn("Traceback", stderr.getvalue())


class PathTests(Workspace):
    def test_relative_and_absolute_roots_are_repo_relative(self) -> None:
        for value in ("custom/plan", str(self.repo / "custom" / "plan")):
            with self.subTest(value=value):
                repo, root = config.resolve_paths(argparse.Namespace(repo=str(self.repo), root=value))
                self.assertEqual(repo, self.repo.resolve())
                self.assertEqual(root, (self.repo / "custom" / "plan").resolve())

    def test_parent_and_absolute_escapes_fail_before_writes(self) -> None:
        for value in ("../outside", str(self.workspace / "outside")):
            with self.subTest(value=value):
                code, result = self.command("setup", "--root", value)
                self.assertEqual(code, 1, result)
                self.assertIn("escapes", result["errors"][0])
                self.assertFalse(self.root.exists())
                self.assertFalse((self.workspace / "outside").exists())

    def test_symlink_root_escape_is_rejected(self) -> None:
        outside = self.workspace / "outside"
        outside.mkdir()
        self.symlink(self.repo / "linked", outside, directory=True)
        code, result = self.command("setup", "--root", "linked/plan")
        self.assertEqual(code, 1, result)
        self.assertFalse((outside / "plan").exists())

    def test_symlink_initializer_directory_escape_is_rejected(self) -> None:
        outside = self.workspace / "outside"
        outside.mkdir()
        self.symlink(self.root / "context", outside, directory=True)
        before = self.snapshot()
        code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        self.assertEqual(list(outside.iterdir()), [])
        self.assertEqual(before, self.snapshot())
        self.assertFalse((self.root / "tasks").exists())

    def test_symlink_config_escape_is_rejected(self) -> None:
        outside = self.workspace / "outside.json"
        outside.write_text("{}", encoding="utf-8")
        self.symlink(self.root / "config.json", outside)
        code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        self.assertEqual(outside.read_text(encoding="utf-8"), "{}")
        self.assertFalse((self.root / "project.md").exists())

    def test_dangling_workflow_symlink_is_not_followed(self) -> None:
        target = self.root / "missing.md"
        self.symlink(self.root / "workflow.md", target)
        code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        self.assertFalse(target.exists())
        self.assertFalse((self.root / "project.md").exists())

    def test_non_directory_root_fails_cleanly(self) -> None:
        self.root.parent.mkdir(parents=True)
        self.root.write_text("user file", encoding="utf-8")
        for command in ("setup", "config", "doctor"):
            code, result = self.command(command)
            self.assertEqual(code, 1, result)
        self.assertEqual(self.root.read_text(encoding="utf-8"), "user file")


class SetupTests(Workspace):
    def test_fresh_setup_emits_one_json_document(self) -> None:
        code, result = self.command("setup", "--title", "Example project")
        self.assertEqual(code, 0, result)
        self.assertEqual(result["initializer"]["returncode"], 0)
        self.assertIn("initialized", result["initializer"]["stdout"])
        self.assertEqual(set(result["created"]), {"project.md", "INDEX.md", "workflow.md", "config.json"})
        self.assertIn("title: Example project", (self.root / "project.md").read_text(encoding="utf-8"))
        self.assertEqual(config.load_config(self.root), config.DEFAULTS)
        self.assertTrue((self.root / "context" / "CATALOG.md").is_file())
        self.assertTrue(any("context/platform.md" in step for step in result["incomplete_steps"]))
        self.assertFalse((self.root / "context" / "platform.md").exists())

    def test_repeat_setup_preserves_all_existing_content_and_mtimes(self) -> None:
        self.command("setup")
        self.write("project.md", "Project-owned custom project\n")
        self.write("INDEX.md", "Project-owned custom index\n")
        self.write("workflow.md", "Project-owned custom workflow\n")
        self.write("context/CATALOG.md", "Project-owned custom catalog\n")
        self.write_config({"hooks": {"enabled": False}, "tdd": "off"})
        before = self.snapshot()
        code, result = self.command("setup", "--title", "Must not replace")
        self.assertEqual(code, 0, result)
        self.assertEqual(result["created"], [])
        self.assertEqual(before, self.snapshot())

    def test_partial_setup_resumes_without_overwriting_project(self) -> None:
        project = self.write("project.md", "Existing project\n")
        code, result = self.command("setup")
        self.assertEqual(code, 0, result)
        self.assertEqual(project.read_text(encoding="utf-8"), "Existing project\n")
        self.assertTrue((self.root / "workflow.md").is_file())
        self.assertIn("project.md", result["preserved"])

    def test_invalid_existing_policy_prevents_all_setup_writes(self) -> None:
        self.write_config({"tdd": "silently-optional"})
        before = self.snapshot()
        with mock.patch.object(config.subprocess, "run") as initializer:
            code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        initializer.assert_not_called()
        self.assertEqual(before, self.snapshot())
        self.assertFalse((self.root / "context").exists())

    def test_setup_uses_interpreter_and_never_force_or_overwrite_helper(self) -> None:
        with mock.patch.object(config.subprocess, "run", wraps=subprocess.run) as initializer:
            with mock.patch.object(config, "atomic_write_json") as overwrite:
                code, result = self.command("setup", "--root", "custom/tree")
        self.assertEqual(code, 0, result)
        argv = initializer.call_args.args[0]
        self.assertEqual(argv[0], sys.executable)
        self.assertEqual(Path(argv[1]), SCRIPTS / "init_plan.py")
        self.assertNotIn("--force", argv)
        self.assertIn("custom/tree", argv)
        self.assertEqual(initializer.call_args.kwargs["cwd"], self.repo.resolve())
        overwrite.assert_not_called()

    def test_failed_initializer_has_structured_output_and_no_policy_writes(self) -> None:
        failure = subprocess.CompletedProcess(["init_plan.py"], 7, "partial output", "failure details")
        with mock.patch.object(config.subprocess, "run", return_value=failure):
            code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        self.assertEqual(result["initializer"]["stdout"], "partial output")
        self.assertEqual(result["initializer"]["stderr"], "failure details")
        self.assertFalse((self.root / "config.json").exists())
        self.assertFalse((self.root / "workflow.md").exists())

    def test_unsafe_title_and_obstructed_directory_prevent_setup(self) -> None:
        for title in ("", "line\nstatus: active", "bad\x00title"):
            code, result = self.command("setup", "--title", title)
            self.assertEqual(code, 1, result)
            self.assertFalse(self.root.exists())
        self.write("tasks", "Do not replace this file")
        code, result = self.command("setup")
        self.assertEqual(code, 1, result)
        self.assertFalse((self.root / "project.md").exists())

    def test_test_commands_are_never_executed(self) -> None:
        sentinel = self.repo / "must-not-exist"
        self.write_config({"test_commands": [[sys.executable, "-c",
                          f"from pathlib import Path; Path({str(sentinel)!r}).touch()"]]})
        for command in ("setup", "config", "doctor"):
            self.command(command)
            self.assertFalse(sentinel.exists())


class AtomicWritesTests(Workspace):
    def test_atomic_json_write_and_replace_use_same_directory(self) -> None:
        path = self.root / "runs" / "machine.json"
        with mock.patch.object(config.os, "replace", wraps=os.replace) as replace:
            config.atomic_write_json(path, {"first": True})
        staged, target = replace.call_args.args
        self.assertEqual(staged.parent, path.parent)
        self.assertEqual(target, path)
        self.assertFalse(staged.exists())
        config.atomic_write_json(path, {"second": True})
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"second": True})
        self.assertEqual(list(path.parent.iterdir()), [path])

    def test_failed_replace_preserves_previous_state_and_cleans_temp(self) -> None:
        path = self.write("state.json", '{"old":true}\n')
        with mock.patch.object(config.os, "replace", side_effect=PermissionError("locked")):
            with self.assertRaises(PermissionError):
                config.atomic_write_json(path, {"new": True})
        self.assertEqual(path.read_text(encoding="utf-8"), '{"old":true}\n')
        self.assertEqual(list(self.root.iterdir()), [path])

    def test_serialization_failure_cannot_damage_previous_state(self) -> None:
        path = self.write("state.json", '{"old":true}\n')
        for data in ({"not_json": object()}, {"number": float("nan")}):
            with self.subTest(data=data):
                with self.assertRaises((TypeError, ValueError)):
                    config.atomic_write_json(path, data)
                self.assertEqual(path.read_text(encoding="utf-8"), '{"old":true}\n')
                self.assertEqual(list(self.root.iterdir()), [path])

    def test_create_only_publication_cannot_clobber_a_user_file(self) -> None:
        path = self.write("workflow.md", "User file\n")
        self.assertFalse(config._create_text(path, "Replacement\n"))
        self.assertEqual(path.read_text(encoding="utf-8"), "User file\n")
        self.assertEqual(list(self.root.iterdir()), [path])
        fresh = self.root / "fresh.json"
        self.assertTrue(config._create_text(fresh, "{}\n"))
        self.assertEqual(fresh.read_text(encoding="utf-8"), "{}\n")

    def test_failed_create_cleans_staging_file(self) -> None:
        self.root.mkdir(parents=True)
        with mock.patch.object(config.os, "link", side_effect=PermissionError("denied")):
            with self.assertRaises(PermissionError):
                config._create_text(self.root / "workflow.md", "text")
        self.assertEqual(list(self.root.iterdir()), [])

    def test_atomic_helper_rejects_symlink_destination(self) -> None:
        target = self.write("user.json", "{}")
        link = self.root / "state.json"
        self.symlink(link, target)
        with self.assertRaises(ValueError):
            config.atomic_write_json(link, {"replace": True})
        self.assertTrue(link.is_symlink())
        self.assertEqual(target.read_text(encoding="utf-8"), "{}")


class DoctorTests(Workspace):
    def test_missing_setup_is_actionable_and_read_only(self) -> None:
        code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertEqual(set(result["checks"]), set(config.REQUIRED_FILES))
        self.assertFalse(any(result["checks"].values()))
        self.assertTrue(any("setup" in error for error in result["errors"]))
        self.assertTrue(any("/ultimate-sdd:context" in error for error in result["errors"]))
        self.assertIn("validation", result)
        self.assertFalse(self.root.exists())

    def test_valid_setup_and_graph_pass_without_writes(self) -> None:
        self.command("setup")
        self.write("context/platform.md", "# Actual platform\nNo application code yet.\n")
        self.write_config({"test_commands": [["project-owned-test-command"]]})
        before = self.snapshot()
        code, result = self.command("doctor")
        self.assertEqual(code, 0, result)
        self.assertTrue(result["validation"]["ok"])
        self.assertGreaterEqual(result["validation"]["artifacts"], 1)
        self.assertTrue(all(result["checks"].values()))
        self.assertEqual(result["warnings"], [])
        self.assertEqual(before, self.snapshot())

    def test_invalid_config_does_not_hide_plan_errors(self) -> None:
        self.command("setup")
        self.write_config({"schema_version": 2})
        self.write("reqs/REQ-1-invalid.md", "---\nid: REQ-1\nreadiness: 9\n---\n")
        code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertIsNone(result["config"])
        self.assertTrue(any("schema_version" in error for error in result["errors"]))
        self.assertTrue(any("readiness" in error for error in result["validation"]["errors"]))

    def test_empty_workflow_and_malformed_project_are_not_healthy(self) -> None:
        self.command("setup")
        self.write("workflow.md", "\n")
        self.write("project.md", "Not a project contract\n")
        code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertTrue(any("Empty workflow.md" in error for error in result["errors"]))
        self.assertTrue(any("id: PROJECT" in error for error in result["errors"]))

    def test_malformed_utf8_is_reported_without_traceback(self) -> None:
        self.command("setup")
        (self.root / "reqs" / "bad.md").write_bytes(b"\xff")
        (self.root / "config.json").write_bytes(b"\xff")
        code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertIsNone(result["config"])
        self.assertFalse(result["validation"]["ok"])
        self.assertTrue(any("Cannot validate plan state" in error for error in result["errors"]))

    def test_external_artifact_symlink_is_not_validated(self) -> None:
        self.command("setup")
        target = self.workspace / "external.md"
        target.write_text("outside plan", encoding="utf-8")
        self.symlink(self.root / "reqs" / "linked.md", target)
        code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertTrue(any("escapes" in error for error in result["validation"]["errors"]))

    def test_external_delta_reference_is_rejected_before_planlib_reads_it(self) -> None:
        self.command("setup")
        self.write("changes/bad/CHANGE.md", "---\nid: CHANGE-1\ndeltas: [../../../../outside]\n---\n")
        with mock.patch.object(config, "validate_tree", side_effect=AssertionError("must not read escaped deltas")):
            code, result = self.command("doctor")
        self.assertEqual(code, 1, result)
        self.assertTrue(any("escapes" in error for error in result["validation"]["errors"]))


if __name__ == "__main__":
    unittest.main()
