"""CLI entry point for the Autonomous Sprite Factory prototype."""

from __future__ import annotations

import argparse
from pathlib import Path

from asf.canon import CANON_DIRNAME, MANIFEST_FILENAME, rebuild_canon, validate_corpus
from asf.exporter import export_asset
from asf.primitives import (
    import_primitive_candidate,
    promote_primitive_candidate,
    validate_primitive_library,
    write_primitive_manifest,
)
from asf.specs import load_spec
from asf.style_packs import load_style_pack


def main() -> None:
    """Parses arguments and exports an asset from a JSON spec."""

    parser = argparse.ArgumentParser(
        description="Render a deterministic 3x3 sprite sheet or manage canon data."
    )
    subparsers = parser.add_subparsers(dest="command")

    canon_parser = subparsers.add_parser(
        "canon", help="Validate or rebuild the style canon."
    )
    canon_subparsers = canon_parser.add_subparsers(dest="canon_command", required=True)
    validate_parser = canon_subparsers.add_parser(
        "validate", help="Validate the corpus manifest, annotations, and source assets."
    )
    validate_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the canon directory.",
    )
    build_parser = canon_subparsers.add_parser(
        "build", help="Rebuild style_canon.json and the family guides."
    )
    build_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the canon directory.",
    )

    primitives_parser = subparsers.add_parser(
        "primitives", help="Validate or rebuild the primitive library."
    )
    primitive_subparsers = primitives_parser.add_subparsers(
        dest="primitive_command", required=True
    )
    primitive_validate_parser = primitive_subparsers.add_parser(
        "validate", help="Validate the primitive library and checked-in manifest."
    )
    primitive_validate_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the primitive library.",
    )
    primitive_build_parser = primitive_subparsers.add_parser(
        "rebuild", help="Rebuild library/primitive_manifest.json from disk."
    )
    primitive_build_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the primitive library.",
    )
    primitive_import_parser = primitive_subparsers.add_parser(
        "import", help="Import a candidate from a source asset and metadata."
    )
    primitive_import_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the primitive library.",
    )
    primitive_import_parser.add_argument(
        "--source",
        required=True,
        type=Path,
        help="Source image to crop into a candidate primitive.",
    )
    primitive_import_parser.add_argument(
        "--metadata",
        required=True,
        type=Path,
        help="Primitive metadata file describing the candidate.",
    )
    primitive_import_parser.add_argument(
        "--candidate-dir",
        type=Path,
        help="Optional explicit candidate directory.",
    )
    primitive_promote_parser = primitive_subparsers.add_parser(
        "promote", help="Promote a staged candidate into the approved library."
    )
    primitive_promote_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the primitive library.",
    )
    primitive_promote_parser.add_argument(
        "--candidate-dir",
        required=True,
        type=Path,
        help="Candidate directory created by the import workflow.",
    )
    primitive_promote_parser.add_argument(
        "--approved-by",
        required=True,
        help="Person or system that approved the candidate.",
    )
    primitive_promote_parser.add_argument(
        "--promoted-at",
        required=True,
        help="ISO-8601 promotion timestamp.",
    )

    parser.add_argument("--spec", help="Path to a sprite spec.")
    parser.add_argument(
        "--output",
        help="Directory where sheet.png and metadata.json will be written.",
    )
    args = parser.parse_args()

    if args.command == "canon":
        manifest_path = args.repo_root / CANON_DIRNAME / MANIFEST_FILENAME
        if args.canon_command == "validate":
            validate_corpus(manifest_path)
        else:
            rebuild_canon(args.repo_root)
        return

    if args.command == "primitives":
        if args.primitive_command == "validate":
            validate_primitive_library(args.repo_root)
        elif args.primitive_command == "rebuild":
            write_primitive_manifest(args.repo_root)
        elif args.primitive_command == "import":
            import_primitive_candidate(
                args.repo_root,
                args.source,
                args.metadata,
                args.candidate_dir,
            )
        else:
            promote_primitive_candidate(
                args.repo_root,
                args.candidate_dir,
                approved_by=args.approved_by,
                promoted_at=args.promoted_at,
            )
        return

    if not args.spec or not args.output:
        parser.error("either the canon subcommand or --spec/--output is required")

    spec = load_spec(args.spec)
    style_pack = load_style_pack(spec.style_pack, spec.palette)
    export_asset(spec, style_pack, Path(args.output))


if __name__ == "__main__":
    main()
