"""CLI entry point for the Autonomous Sprite Factory prototype."""

from __future__ import annotations

import argparse
from pathlib import Path

from asf.exporter import export_asset
from asf.specs import load_spec
from asf.style_packs import load_style_pack


def main() -> None:
    """Parses arguments and exports an asset from a JSON spec."""

    parser = argparse.ArgumentParser(
        description="Render a deterministic 3x3 sprite sheet from a spec."
    )
    parser.add_argument("--spec", required=True, help="Path to a sprite spec.")
    parser.add_argument(
        "--output",
        required=True,
        help="Directory where sheet.png and metadata.json will be written.",
    )
    args = parser.parse_args()

    spec = load_spec(args.spec)
    style_pack = load_style_pack(spec.style_pack, spec.palette)
    export_asset(spec, style_pack, Path(args.output))


if __name__ == "__main__":
    main()
