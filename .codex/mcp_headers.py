"""Supply MCP authentication from the project's private .env file."""

import json
from pathlib import Path
import sys


def main():
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        sys.exit("Missing project .env file for MCP authentication")

    for line in env_path.read_text().splitlines():
        key, separator, value = line.strip().partition("=")
        if separator and key == "MERITX_MCP_TOKEN":
            token = value.strip().strip("\"'")
            if token:
                print(json.dumps({"Authorization": "Bearer " + token}))
                return

    sys.exit("MERITX_MCP_TOKEN is missing or empty in the project .env file")


if __name__ == "__main__":
    main()
