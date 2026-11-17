"""Exercise deployment integrity and rollback without touching the live website."""

import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import spaceship_release as release


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        root = Path(self.directory.name)
        self.base, self.site = root / "private", root / "site"
        self.base.mkdir()
        (self.base / "releases").mkdir()
        self.site.mkdir()
        (self.site / "index.html").write_text("Original live site")
        self.enquiries = root / ".meritx-enquiries"
        self.enquiries.mkdir()
        (self.enquiries / "private.json").write_text("private enquiry")
        self.patches = [patch.object(release, "BASE", self.base), patch.object(release, "SITE", self.site),
                        patch.object(release, "exchange", self.exchange), patch.object(release, "health"),
                        patch.object(release.subprocess, "run")]
        self.mocks = [item.start() for item in self.patches]
        self.addCleanup(self.directory.cleanup)
        for item in self.patches:
            self.addCleanup(item.stop)
        self.sha = "a" * 40

    def exchange(self, left, right):
        temporary = left.parent / "exchange.tmp"
        left.rename(temporary)
        right.rename(left)
        temporary.rename(right)

    def bundle(self, extra=None):
        output = io.BytesIO()
        files = {name: b"MeritX production" for name in release.REQUIRED}
        files.update(extra or {})
        with tarfile.open(fileobj=output, mode="w:gz") as archive:
            for name, content in files.items():
                item = tarfile.TarInfo(name)
                item.size = len(content)
                archive.addfile(item, io.BytesIO(content))
        return output.getvalue()

    def deploy(self, run="1", data=None):
        data = data or self.bundle()
        return release.deploy(self.sha + "-" + run + "-1", self.sha, hashlib.sha256(data).hexdigest(), io.BytesIO(data))

    def test_success_preserves_previous_and_private_enquiries(self):
        first = self.deploy()
        self.assertEqual((self.base / "releases" / first["previous"] / "index.html").read_text(), "Original live site")
        second = self.deploy("2")
        self.assertEqual(second["previous_release"], first["current"])
        self.assertEqual(len(list((self.base / "releases").iterdir())), 1)
        rolled_back = release.rollback(second["current"])
        self.assertEqual(rolled_back["current"], first["current"])
        self.assertEqual((self.enquiries / "private.json").read_text(), "private enquiry")

    def test_health_failure_restores_live_site_and_keeps_previous_backup(self):
        first = self.deploy()
        self.mocks[3].side_effect = RuntimeError("Unhealthy website")
        with self.assertRaisesRegex(RuntimeError, "Unhealthy"):
            self.deploy("2")
        self.assertEqual(release.release_at(self.site), first["current"])
        self.assertEqual(release.read_json(self.base / "state.json"), first)
        self.assertTrue((self.base / "releases" / first["previous"]).exists())

    def test_checksum_failure_never_changes_live_site(self):
        with self.assertRaisesRegex(ValueError, "checksum"):
            release.deploy(self.sha + "-1-1", self.sha, "0" * 64, io.BytesIO(self.bundle()))
        self.assertEqual((self.site / "index.html").read_text(), "Original live site")

    def test_rejects_path_traversal_private_files_and_noindex(self):
        for extra in ({"../escape": b"bad"}, {".env": b"secret"}, {"src/source.ts": b"source"}, {"index.html": b'<meta name="robots" content="noindex">'}):
            with self.subTest(extra=list(extra)), self.assertRaises(ValueError):
                self.deploy(data=self.bundle(extra))
        self.assertEqual((self.site / "index.html").read_text(), "Original live site")

    def test_stale_rollback_is_rejected(self):
        self.deploy()
        with self.assertRaisesRegex(ValueError, "changed"):
            release.rollback("outdated")

    def test_interrupted_switch_is_reverted_before_next_operation(self):
        first = self.deploy()
        slot = self.base / "releases" / (self.sha + "-2-1")
        slot.mkdir()
        release.save_json(slot / "release.json", {"release": self.sha + "-2-1"})
        release.save_json(self.base / "pending.json", {"before": first["current"], "after": self.sha + "-2-1", "slot": slot.name, "transaction": slot.name})
        self.exchange(self.site, slot)
        release.recover()
        self.assertEqual(release.release_at(self.site), first["current"])
        self.assertFalse((self.base / "pending.json").exists())

    def test_rejects_archive_symlinks(self):
        data = io.BytesIO(self.bundle())
        with tarfile.open(fileobj=data, mode="r:gz") as original:
            items = [(item, original.extractfile(item).read()) for item in original.getmembers()]
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w:gz") as archive:
            for item, contents in items:
                archive.addfile(item, io.BytesIO(contents))
            link = tarfile.TarInfo("unsafe-link")
            link.type, link.linkname = tarfile.SYMTYPE, "/etc/passwd"
            archive.addfile(link)
        with self.assertRaisesRegex(ValueError, "Links"):
            self.deploy(data=output.getvalue())


if __name__ == "__main__":
    unittest.main()
