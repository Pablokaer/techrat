"""Tests for deploy/backup.sh (run: python3 -m unittest discover -s deploy -p "test_*.py").

A fake `docker` first on PATH stands in for `docker compose exec postgres pg_dump`: it prints a dump or fails on demand.
"""
import gzip
import os
import shutil
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

from test_deploy import BASH, write_exe

SCRIPT = Path(__file__).resolve().parent / "backup.sh"
DAY = 24 * 60 * 60


class BackupScriptTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        write_exe(
            bin_dir / "docker",
            'if [[ "$*" == *pg_dump* ]]; then\n'
            '  printf "%s" "${FAKE_DUMP-SELECT 1;}"\n'
            '  exit "${FAKE_DUMP_EXIT:-0}"\n'
            "fi\n",
        )
        self.backups = self.tmp / "backups"
        self.app = self.tmp / "app"
        self.app.mkdir()
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
            "TECHRAT_DIR": str(self.app),
            "BACKUP_DIR": str(self.backups),
        }

    def run_backup(self, **env):
        return subprocess.run([BASH, str(SCRIPT)], env={**self.env, **env}, capture_output=True, text=True)

    def backups_made(self):
        return sorted(self.backups.glob("techrat-*.sql.gz")) if self.backups.exists() else []

    def age(self, path: Path, days: float):
        past = time.time() - days * DAY
        os.utime(path, (past, past))

    def test_writes_a_compressed_dump_with_a_timestamped_name(self):
        r = self.run_backup()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        (made,) = self.backups_made()
        self.assertRegex(made.name, r"^techrat-\d{4}-\d{2}-\d{2}T\d{6}Z\.sql\.gz$")
        self.assertEqual(gzip.decompress(made.read_bytes()), b"SELECT 1;")

    @unittest.skipIf(os.name == "nt", "POSIX permissions")
    def test_dump_is_readable_by_the_owner_only(self):
        self.run_backup()
        (made,) = self.backups_made()
        self.assertEqual(made.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.backups.stat().st_mode & 0o777, 0o700)

    def test_deletes_backups_older_than_the_retention_period_and_keeps_newer_ones(self):
        self.backups.mkdir()
        old, recent, other = (self.backups / n for n in ("techrat-old.sql.gz", "techrat-recent.sql.gz", "notes.txt"))
        for f in (old, recent, other):
            f.write_text("x")
        self.age(old, 15)
        self.age(recent, 13)
        self.age(other, 400)

        r = self.run_backup(RETENTION_DAYS="14")

        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse(old.exists())
        self.assertTrue(recent.exists())
        self.assertTrue(other.exists(), "only techrat-*.sql.gz files are ever deleted")

    def test_a_failing_dump_leaves_no_file_and_deletes_nothing(self):
        self.backups.mkdir()
        old = self.backups / "techrat-old.sql.gz"
        old.write_text("x")
        self.age(old, 100)

        r = self.run_backup(FAKE_DUMP_EXIT="1")

        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.backups_made(), [old])
        self.assertEqual(list(self.backups.glob("*.partial")), [])

    def test_an_empty_dump_is_a_failure(self):
        r = self.run_backup(FAKE_DUMP="")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.backups_made(), [])

    def test_refuses_a_retention_period_that_is_not_a_number(self):
        r = self.run_backup(RETENTION_DAYS="; rm -rf /")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.backups_made(), [])


if __name__ == "__main__":
    unittest.main()
