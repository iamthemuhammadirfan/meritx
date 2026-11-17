#!/usr/bin/env python3
"""Package only out/ and send it to the restricted Spaceship release handler."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile


def ssh(command, stream=None):
    result = subprocess.run(
        ["ssh", "-T", "-p", "21098", "-i", os.environ["SPACESHIP_SSH_KEY_FILE"],
         "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=yes",
         "-o", "UserKnownHostsFile=" + os.environ["SPACESHIP_KNOWN_HOSTS_FILE"],
         "-o", "ConnectTimeout=20", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4",
         "rhjnctqjdv@server38.shared.spaceship.host", command],
        stdin=stream if stream else subprocess.DEVNULL, stdout=subprocess.PIPE, text=True,
    )
    if result.returncode:
        raise SystemExit("Spaceship rejected the operation; check the release logs above")
    state = json.loads(result.stdout)
    print(json.dumps(state, indent=2))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as output:
            output.write("Live release: `{}`\n\nPrevious release: `{}`\n".format(state["current"], state.get("previous_release", "none")))
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["deploy", "rollback", "status"])
    parser.add_argument("--expected-release")
    args = parser.parse_args()
    if args.operation == "status":
        ssh("status")
    elif args.operation == "rollback":
        if not args.expected_release or not re.fullmatch(r"[a-f0-9]{40}-[0-9]+-[0-9]+|baseline", args.expected_release):
            parser.error("Rollback requires the exact --expected-release from deployment status")
        ssh("rollback " + args.expected_release)
    else:
        sha = os.environ["GITHUB_SHA"]
        run, attempt = os.environ["GITHUB_RUN_ID"], os.environ["GITHUB_RUN_ATTEMPT"]
        if not re.fullmatch(r"[a-f0-9]{40}", sha) or not run.isdigit() or not attempt.isdigit():
            parser.error("Invalid GitHub release metadata")
        if os.environ.get("GITHUB_REF") != "refs/heads/main" or os.environ.get("GITHUB_EVENT_NAME") != "push":
            parser.error("Production deployment is permitted only for pushes to main")
        site = Path("out")
        if not (site / "index.html").is_file():
            parser.error("Missing production static export")
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "site.tar.gz"
            with tarfile.open(archive, "w:gz") as bundle:
                for path in sorted(site.rglob("*")):
                    if path.is_symlink():
                        parser.error("Static export contains a symlink")
                    if path.is_file():
                        bundle.add(path, arcname=str(path.relative_to(site)), recursive=False)
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            with archive.open("rb") as stream:
                ssh("deploy {}-{}-{} {} {}".format(sha, run, attempt, sha, digest), stream)


if __name__ == "__main__":
    main()
