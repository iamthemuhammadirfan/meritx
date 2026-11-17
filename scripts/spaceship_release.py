#!/usr/bin/env python3
"""Restricted SSH entry point, installed outside the Spaceship document root.

Compatible with the hosting account's Python 3.6. Only the fixed MeritX site
can be changed. No shell commands supplied by the SSH client are executed.
"""

import ctypes
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request


BASE = Path.home() / ".meritx-deploy" / "github"
SITE = Path.home() / "meritxsc.com"
URL = "https://meritxsc.com"
MAX_ARCHIVE = 32 * 1024 * 1024
MAX_EXPANDED = 128 * 1024 * 1024
RELEASE = re.compile(r"^[a-f0-9]{40}-[0-9]+-[0-9]+$")
REQUIRED = ("index.html", "contact/index.html", "404.html", ".htaccess", "api/enquiry.php")
FORBIDDEN = {".git", ".codex", ".private", ".ssh", "node_modules", "src", "docs"}


def save_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value) + "\n")
    temporary.chmod(0o600)
    with temporary.open("rb") as stream:
        os.fsync(stream.fileno())
    os.replace(str(temporary), str(path))
    descriptor = os.open(str(path.parent), os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def read_json(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def release_at(path):
    return read_json(path / "release.json", {"release": "baseline"})["release"]


def exchange(left, right):
    """Linux RENAME_EXCHANGE replaces two directories in one atomic operation."""
    rename = ctypes.CDLL(None, use_errno=True).renameat2
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(-100, os.fsencode(str(left)), -100, os.fsencode(str(right)), 2):
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))


def recover():
    """Recover an interrupted switch before accepting another operation."""
    pending_path = BASE / "pending.json"
    pending = read_json(pending_path)
    if not pending:
        return
    state = read_json(BASE / "state.json", {})
    slot = BASE / "releases" / pending["slot"]
    if state.get("transaction") != pending["transaction"]:
        if release_at(SITE) == pending["after"]:
            exchange(SITE, slot)
        if release_at(SITE) != pending["before"]:
            raise RuntimeError("Interrupted release needs operator review; no files removed")
    pending_path.unlink()


def response(path):
    request = urllib.request.Request(
        URL + path + ("&" if "?" in path else "?") + "check=" + str(time.time_ns() if hasattr(time, "time_ns") else time.time()),
        headers={"Cache-Control": "no-cache", "User-Agent": "MeritX-release-check"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as result:
            return result.status, result.read(2 * 1024 * 1024), result.headers
    except urllib.error.HTTPError as error:
        return error.code, error.read(4096), error.headers


def health(expected):
    for attempt in range(3):
        try:
            if expected != "baseline":
                status, body, _ = response("/release.json")
                if status != 200 or json.loads(body.decode())["release"] != expected:
                    raise RuntimeError("Public release identifier does not match")
            for path in ("/", "/contact/"):
                status, body, _ = response(path)
                if status != 200 or b"MeritX" not in body:
                    raise RuntimeError("Public page failed: " + path)
            status, body, headers = response("/api/enquiry.php")
            if status != 405 or "application/json" not in headers.get("Content-Type", "") or json.loads(body.decode()).get("ok") is not False:
                raise RuntimeError("PHP enquiry endpoint failed its read-only check")
            return
        except (OSError, ValueError, KeyError, RuntimeError) as error:
            if attempt == 2:
                raise RuntimeError("Release health check failed: " + str(error))
            time.sleep(2)


def unpack(archive, destination):
    with tarfile.open(str(archive), "r:gz") as bundle:
        members = bundle.getmembers()
        if len(members) > 10000 or sum(item.size for item in members) > MAX_EXPANDED:
            raise ValueError("Release exceeds file or size limits")
        names = set()
        for item in members:
            path = PurePosixPath(item.name)
            if path.is_absolute() or ".." in path.parts or not path.parts or str(path) in names:
                raise ValueError("Unsafe or duplicate archive path")
            if any(part in FORBIDDEN or part.startswith(".env") for part in path.parts):
                raise ValueError("Private or source file in release")
            if not (item.isfile() or item.isdir()):
                raise ValueError("Links and special files are forbidden")
            if item.isfile() and path.suffix == ".php" and str(path) != "api/enquiry.php":
                raise ValueError("Unexpected executable PHP file")
            names.add(str(path))
        if not all(name in names for name in REQUIRED):
            raise ValueError("Release is missing required website files")
        # Extract validated regular files manually; archive metadata is never applied.
        for item in members:
            target = destination / item.name
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(item) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
                target.chmod(0o644)
        for directory, _, _ in os.walk(str(destination)):
            os.chmod(directory, 0o755)
    subprocess.run(["/bin/php", "-l", str(destination / "api/enquiry.php")], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if "noindex" in (destination / "index.html").read_text().lower():
        raise ValueError("Refusing to publish a noindex build")


def switch(slot, after, transaction):
    before = release_at(SITE)
    pending = {"before": before, "after": after, "slot": slot.name, "transaction": transaction}
    save_json(BASE / "pending.json", pending)
    exchange(SITE, slot)
    try:
        health(after)
    except Exception:
        exchange(SITE, slot)
        (BASE / "pending.json").unlink()
        raise
    state = {"current": after, "previous": slot.name, "previous_release": before, "transaction": transaction}
    save_json(BASE / "state.json", state)
    (BASE / "pending.json").unlink()
    return state


def deploy(release, sha, digest, stream):
    if not RELEASE.fullmatch(release) or release.split("-")[0] != sha or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("Invalid release identifier, commit or checksum")
    if release_at(SITE) == release:
        health(release)
        return read_json(BASE / "state.json")
    slot = BASE / "releases" / release
    if slot.exists():
        raise ValueError("Release ID already exists; use a new run attempt")
    archive = BASE / "upload.tar.gz"
    hasher = hashlib.sha256()
    size = 0
    try:
        with archive.open("wb") as output:
            while True:
                chunk = stream.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_ARCHIVE:
                    raise ValueError("Upload exceeds compressed size limit")
                hasher.update(chunk)
                output.write(chunk)
        if hasher.hexdigest() != digest:
            raise ValueError("Release checksum mismatch")
        slot.mkdir(mode=0o755)
        unpack(archive, slot)
        (slot / "release.json").write_text(json.dumps({"release": release, "commit": sha}) + "\n")
        (slot / "release.json").chmod(0o644)
        state = switch(slot, release, release)
    except Exception:
        # Once switched, slot holds the live site's backup: never delete it here.
        pending = read_json(BASE / "pending.json", {})
        state = read_json(BASE / "state.json", {})
        if slot.exists() and state.get("previous") != release and pending.get("slot") != release:
            shutil.rmtree(str(slot))
        raise
    finally:
        if archive.exists():
            archive.unlink()
    for old in (BASE / "releases").iterdir():
        if old.name != state["previous"] and old.is_dir() and not old.is_symlink():
            shutil.rmtree(str(old))
    return state


def rollback(expected):
    state = read_json(BASE / "state.json", {})
    if release_at(SITE) != expected or state.get("current") != expected:
        raise ValueError("Live release changed; review status before rolling back")
    slot = BASE / "releases" / state["previous"]
    if not slot.is_dir() or release_at(slot) != state["previous_release"]:
        raise ValueError("Previous release is unavailable or inconsistent")
    return switch(slot, state["previous_release"], "rollback-" + str(time.time()))


def main():
    os.umask(0o022)
    BASE.mkdir(mode=0o700, parents=True, exist_ok=True)
    BASE.chmod(0o700)
    (BASE / "releases").mkdir(mode=0o700, exist_ok=True)
    if SITE.is_symlink() or not SITE.is_dir():
        raise ValueError("Expected a real directory for the fixed document root")
    args = shlex.split(os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    with (BASE / "release.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        recover()
        if args == ["status"]:
            result = read_json(BASE / "state.json", {"current": release_at(SITE), "previous": None})
        elif len(args) == 4 and args[0] == "deploy":
            result = deploy(args[1], args[2], args[3], sys.stdin.buffer)
        elif len(args) == 2 and args[0] == "rollback":
            result = rollback(args[1])
        else:
            raise ValueError("Only status, deploy and rollback commands are allowed")
        print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Release failed: " + str(error), file=sys.stderr)
        sys.exit(1)
