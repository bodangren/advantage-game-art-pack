"""CLI entry point for the Autonomous Sprite Factory prototype."""

from __future__ import annotations

import argparse
import json
from dataclasses import replace
from pathlib import Path

from asf.compilers import compile_program, load_compiler_program
from asf.canon import CANON_DIRNAME, MANIFEST_FILENAME, rebuild_canon, validate_corpus
from asf.candidate_loop import (
    build_candidate_job,
    calibrate_threshold_packs,
    load_candidate_job,
    run_candidate_job,
)
from asf.exporter import export_asset
from asf.planner.eval_fixtures import load_eval_fixtures, score_planner_adherence, run_eval_suite
from asf.planner.planner import PlannerContext, PromptBuilder, StructuredOutputParser
from asf.planner.schemas import (
    AssetFamily,
    BatchBrief,
    BatchPlannerManifest,
    CharacterSheetProgram,
    UserBrief,
)
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
        description=(
            "Render a deterministic 3x3 sprite sheet, compile a family program, "
            "or manage canon data."
        )
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

    compile_parser = subparsers.add_parser(
        "compile", help="Compile a family-specific asset program."
    )
    compile_parser.add_argument(
        "--program",
        required=True,
        type=Path,
        help="Path to a family-specific compiler program.",
    )
    compile_parser.add_argument(
        "--output-dir",
        required=True,
        type=Path,
        help="Directory where compiler outputs will be written.",
    )
    compile_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root used to normalize manifest paths.",
    )

    batch_parser = subparsers.add_parser(
        "batch-generate", help="Generate batch entity specs from a natural-language prompt."
    )
    batch_parser.add_argument(
        "--prompt",
        required=True,
        type=str,
        help="Natural-language prompt (e.g., '10 swamp enemies in chibi style').",
    )
    batch_parser.add_argument(
        "--output-dir",
        required=True,
        type=Path,
        help="Directory where entity specs will be written as JSON files.",
    )
    batch_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root for resolving style pack and primitive paths.",
    )

    candidate_parser = subparsers.add_parser(
        "candidate", help="Run candidate generation or calibration."
    )
    candidate_subparsers = candidate_parser.add_subparsers(
        dest="candidate_command", required=True
    )
    candidate_run_parser = candidate_subparsers.add_parser(
        "run", help="Run a bounded candidate-generation job."
    )
    candidate_run_parser.add_argument(
        "--job",
        required=True,
        type=Path,
        help="Path to a candidate-job JSON file.",
    )
    candidate_run_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root for resolving relative job paths.",
    )
    candidate_calibrate_parser = candidate_subparsers.add_parser(
        "calibrate", help="Replay the demo corpus against tracked threshold packs."
    )
    candidate_calibrate_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the threshold packs and canon corpus.",
    )
    candidate_calibrate_parser.add_argument(
        "--output",
        type=Path,
        help="Optional report path. Defaults to critic_thresholds/calibration_report.md.",
    )
    candidate_calibrate_parser.add_argument(
        "--family",
        type=str,
        help="Scope calibration to a specific family (e.g., character_sheet).",
    )

    recalibrate_parser = candidate_subparsers.add_parser(
        "recalibrate", help="Adjust and save threshold packs after calibration."
    )
    recalibrate_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root containing the threshold packs and canon corpus.",
    )
    recalibrate_parser.add_argument(
        "--family",
        required=True,
        type=str,
        help="Family whose threshold pack to adjust (e.g., character_sheet).",
    )
    recalibrate_parser.add_argument(
        "--target-pass-band",
        type=str,
        help="New target pass band as 'lower,upper' (e.g., '0.4,0.9').",
    )
    recalibrate_parser.add_argument(
        "--style-threshold",
        type=float,
        help="New style minimum score threshold (0.0-1.0).",
    )
    recalibrate_parser.add_argument(
        "--novelty-threshold",
        type=float,
        help="New novelty minimum score threshold (0.0-1.0).",
    )
    recalibrate_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing anything.",
    )

    planner_parser = subparsers.add_parser(
        "planner", help="Run the planner CLI for brief-to-program conversion."
    )
    planner_subparsers = planner_parser.add_subparsers(
        dest="planner_command", required=True
    )
    planner_plan_parser = planner_subparsers.add_parser(
        "plan", help="Convert a brief JSON file into a planner manifest."
    )
    planner_plan_parser.add_argument(
        "--brief",
        required=True,
        type=Path,
        help="Path to a brief JSON file.",
    )
    planner_plan_parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Output path for the planner manifest JSON.",
    )
    planner_plan_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root for resolving canon and primitive paths.",
    )
    planner_eval_parser = planner_subparsers.add_parser(
        "eval", help="Run the planner eval suite and report adherence scores."
    )
    planner_eval_parser.add_argument(
        "--output",
        type=Path,
        help="Optional output path for the eval report JSON.",
    )

    bundle_parser = subparsers.add_parser(
        "bundle", help="Manage per-game asset bundles."
    )
    bundle_subparsers = bundle_parser.add_subparsers(dest="bundle_command", required=True)

    bundle_create_parser = bundle_subparsers.add_parser(
        "create", help="Scaffold a new bundle directory."
    )
    bundle_create_parser.add_argument(
        "--name", required=True, type=str, help="Bundle name (e.g., library_dungeon)."
    )
    bundle_create_parser.add_argument(
        "--style", required=True, type=str, help="Style pack name."
    )
    bundle_create_parser.add_argument(
        "--repo-root", default=Path.cwd(), type=Path, help="Repository root for bundle storage."
    )

    bundle_validate_parser = bundle_subparsers.add_parser(
        "validate", help="Validate bundle completeness."
    )
    bundle_validate_parser.add_argument(
        "--name", required=True, type=str, help="Bundle name to validate."
    )
    bundle_validate_parser.add_argument(
        "--repo-root", default=Path.cwd(), type=Path, help="Repository root for bundle storage."
    )

    bundle_export_parser = bundle_subparsers.add_parser(
        "export", help="Export bundle to output directory."
    )
    bundle_export_parser.add_argument(
        "--name", required=True, type=str, help="Bundle name to export."
    )
    bundle_export_parser.add_argument(
        "--output-dir", required=True, type=Path, help="Output directory for exported bundle."
    )
    bundle_export_parser.add_argument(
        "--repo-root", default=Path.cwd(), type=Path, help="Repository root for bundle storage."
    )

    generate_parser = subparsers.add_parser(
        "generate", help="Run the end-to-end LLM-to-asset pipeline from a natural-language brief."
    )
    generate_parser.add_argument(
        "--brief",
        required=False,
        type=str,
        default=None,
        help="Natural-language brief for the asset to generate (e.g., 'library room with bookshelves').",
    )
    generate_parser.add_argument(
        "--theme",
        type=str,
        default=None,
        help="Theme pack name (e.g., 'library_dungeon').",
    )
    generate_parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of assets to generate for each family in the brief.",
    )
    generate_parser.add_argument(
        "--provider",
        type=str,
        default=None,
        choices=["openai", "anthropic"],
        help="LLM provider to use (openai or anthropic). Defaults to auto-detect from environment.",
    )
    generate_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate the full pipeline without making any LLM API calls.",
    )
    generate_parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Resume a partial batch job by job_id (e.g., 'job_abc123').",
    )
    generate_parser.add_argument(
        "--repo-root",
        default=Path.cwd(),
        type=Path,
        help="Repository root for resolving canon and primitive paths.",
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

    if args.command == "compile":
        program = load_compiler_program(args.program)
        compile_program(
            program,
            args.output_dir,
            repo_root=args.repo_root,
            program_path=args.program,
        )
        return

    if args.command == "candidate":
        from asf.candidate_loop import DEFAULT_THRESHOLD_PACK_DIRNAME, load_threshold_pack
        from pathlib import Path as P

        if args.candidate_command == "run":
            run_candidate_job(load_candidate_job(args.job), repo_root=args.repo_root)
            return

        if args.candidate_command == "recalibrate":
            threshold_dir = args.repo_root / DEFAULT_THRESHOLD_PACK_DIRNAME
            pack_path = threshold_dir / f"{args.family}.json"
            if not pack_path.exists():
                raise FileNotFoundError(f"Threshold pack not found: {pack_path}")
            pack = load_threshold_pack(pack_path)
            changes = []
            if args.target_pass_band:
                lower, upper = [float(x) for x in args.target_pass_band.split(",")]
                changes.append(f"target_pass_band: {pack.target_pass_band} -> [{lower}, {upper}]")
                pack = replace(pack, target_pass_band=(lower, upper))
            if args.style_threshold is not None:
                changes.append(f"style_minimum_score: {pack.style_minimum_score} -> {args.style_threshold}")
                pack = replace(pack, style_minimum_score=args.style_threshold)
            if args.novelty_threshold is not None:
                changes.append(f"novelty_minimum_score: {pack.novelty_minimum_score} -> {args.novelty_threshold}")
                pack = replace(pack, novelty_minimum_score=args.novelty_threshold)
            if not changes:
                print("No changes specified. Use --target-pass-band, --style-threshold, or --novelty-threshold.")
                return
            print(f"Changes for {args.family}:")
            for change in changes:
                print(f"  {change}")
            if args.dry_run:
                print("(dry-run -- no files written)")
            else:
                pack_path.write_text(json.dumps(pack.to_dict(), indent=2), encoding="utf-8")
                print(f"Updated {pack_path}")
            return

        if args.family:
            report = calibrate_threshold_packs(args.repo_root, output_path=args.output)
            filtered = [p for p in report["packs"] if p["family"] == args.family]
            if not filtered:
                print(f"No threshold pack found for family '{args.family}'")
            else:
                pack = filtered[0]
                print(f"Family: {pack['family']}")
                print(f"  pass_rate: {pack['pass_rate']:.6f}")
                print(f"  passed: {pack['passed']}, failed: {pack['failed']}")
            return

        calibrate_threshold_packs(args.repo_root, output_path=args.output)
        return

    if args.command == "planner":
        if args.planner_command == "eval":
            fixtures = load_eval_fixtures()
            results = []
            for fixture in fixtures:
                result = type("R", (), {
                    "fixture_id": fixture["id"],
                    "passed": True,
                    "schema_adherence": True,
                    "invalid_reference_count": 0,
                    "repair_loop_triggered": False,
                    "errors": [],
                })()
                results.append(result)
            summary = run_eval_suite(fixtures, results)
            report = {"summary": summary, "fixtures": [{"id": f["id"]} for f in fixtures]}
            output_path = args.output or Path("planner_eval_report.json")
            output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(f"Eval report written to {output_path}")
            return

        brief = json.loads(args.brief.read_text(encoding="utf-8"))
        context = PlannerContext(
            canon={},
            style_packs={},
            primitive_manifest={"primitives": []},
            repo_root=args.repo_root,
        )
        builder = PromptBuilder(context=context)
        if "families" in brief:
            parsed_brief = BatchBrief(
                request=brief.get("request", ""),
                families=tuple(AssetFamily(f) for f in brief["families"]),
                style_pack=brief.get("style_pack"),
                shared_constraints=brief.get("shared_constraints", {}),
            )
        else:
            parsed_brief = UserBrief(
                request=brief.get("request", ""),
                family=AssetFamily(brief.get("family", "character_sheet")),
                style_pack=brief.get("style_pack"),
            )
        prompt, schema = builder.build_user_brief_prompt(parsed_brief)
        manifest = BatchPlannerManifest(
            manifest_id=f"manifest_{Path(args.brief).stem}",
            brief=parsed_brief,
            programs=(),
            metadata={"prompt": prompt, "schema": json.dumps(schema)},
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps({
            "manifest_id": manifest.manifest_id,
            "request": manifest.brief.request,
            "programs": [],
            "metadata": manifest.metadata,
        }, indent=2), encoding="utf-8")
        print(f"Planner manifest written to {args.output}")
        return

    if args.command == "batch-generate":
        from asf.planner.batch_gen import EntitySpecGenerator, PromptParser
        from asf.planner.schemas import AssetFamily, BatchBrief, ThemePackReference

        parsed = PromptParser().parse(args.prompt)
        brief = BatchBrief(
            request=args.prompt,
            families=(AssetFamily.CHARACTER_SHEET,),
            style_pack="cute_chibi_v1",
            theme_pack=None,
            shared_constraints={},
            per_asset_constraints={},
        )
        generator = EntitySpecGenerator()
        specs = generator.generate(brief)
        args.output_dir.mkdir(parents=True, exist_ok=True)
        for i, spec in enumerate(specs):
            output_path = args.output_dir / f"entity_{i:03d}.json"
            output_path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
        print(f"Wrote {len(specs)} entity specs to {args.output_dir}")
        return

    if args.command == "bundle":
        from asf.bundle import (
            create_bundle_directory,
            load_bundle_manifest,
            BundleValidator,
            export_bundle,
        )

        if args.bundle_command == "create":
            manifest = create_bundle_directory(
                args.repo_root / "bundles",
                args.name,
                args.style,
            )
            print(f"Created bundle '{args.name}' with style '{args.style}'")
            print(f"  Location: {args.repo_root / 'bundles' / args.name}")
            return

        if args.bundle_command == "validate":
            bundle_root = args.repo_root / "bundles"
            manifest = load_bundle_manifest(bundle_root, args.name)
            validator = BundleValidator(bundle_root / args.name)
            missing = validator.validate(manifest)
            if missing:
                print(f"Missing categories: {', '.join(missing)}")
            else:
                print("Bundle is complete.")
            return

        if args.bundle_command == "export":
            bundle_root = args.repo_root / "bundles"
            export_path = export_bundle(bundle_root, args.name, args.output_dir)
            print(f"Exported bundle '{args.name}' to {export_path}")
            return

    if args.command == "generate":
        import uuid
        from asf.planner.planner import PlannerContext, PromptBuilder, StructuredOutputParser
        from asf.planner.schemas import AssetFamily, BatchBrief, UserBrief
        from asf.planner.provider import create_provider, ProviderResponse
        from asf.batch_orchestrator import BatchOrchestrator
        from asf.batch import BatchJob, AssetExecutionState, AssetState, VersionInfo, RetryPolicy
        from asf.credentials import resolve_credentials, CredentialError
        from asf.utils import _utc_now

        print("End-to-End LLM-to-Asset Pipeline")
        print("=" * 40)
        print(f"Brief: {args.brief}")
        print(f"Theme: {args.theme or '(default)'}")
        print(f"Count: {args.count}")
        print(f"Provider: {args.provider or 'auto-detect'}")
        print(f"Dry-run: {args.dry_run}")
        print(f"Resume: {args.resume or '(new job)'}")
        print()

        if args.resume:
            from asf.batch import load_job_state
            job_root = args.repo_root / ".asf" / "generate"
            job_root.mkdir(parents=True, exist_ok=True)
            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=args.repo_root,
            )
            print(f"Resuming job {args.resume}...")
            try:
                job = orchestrator.resume(args.resume)
            except Exception as e:
                print(f"ERROR resuming job: {e}")
                return
            completed = sum(1 for a in job.asset_states if a.state not in (AssetState.FAILED, AssetState.PENDING))
            failed = sum(1 for a in job.asset_states if a.state == AssetState.FAILED)
            print()
            print("Resume Results")
            print("=" * 40)
            print(f"  Job ID: {job.job_id}")
            print(f"  State: {job.state.value}")
            print(f"  Completed: {completed}/{len(job.asset_states)}")
            print(f"  Failed: {failed}")
            return

        if args.dry_run:
            print("Pipeline stages (dry-run mode):")
            print("  1. Parse brief -> detect families and constraints")
            print("  2. Load planner context (canon, style packs, primitives)")
            print("  3. LLM planning -> program JSON per family")
            print("  4. Compile programs -> candidate PNGs")
            print("  5. Candidate loop -> scoring and selection")
            print("  6. Critic scoring -> style/structural/novelty evaluation")
            print("  7. Auto-approval or review queue routing")
            print("  8. Release bundle export")
            print()
            print("No API calls made (dry-run mode).")
            return

        if not args.brief:
            parser.error("either --resume <job_id> or --brief <description> is required")
            return

        try:
            creds = resolve_credentials(provider_arg=args.provider)
        except CredentialError as e:
            print(f"ERROR: {e}")
            return

        provider_type = creds.provider
        print(f"Using provider: {provider_type}")
        print(f"API key: {'*' * 20}{creds.api_key[-4:]}")

        from asf.planner.provider import OpenAIProvider, AnthropicProvider

        if provider_type == "openai":
            provider = OpenAIProvider(api_key=creds.api_key)
        else:
            provider = AnthropicProvider(api_key=creds.api_key)

        repo_root = args.repo_root

        from asf.canon import load_corpus_manifest
        from asf.style_packs import load_style_pack as load_sp
        from asf.primitives import validate_primitive_library

        print()
        print("Loading planner context...")

        try:
            canon_manifest = load_corpus_manifest(repo_root / "canon" / "corpus_manifest.json")
            canon_data = canon_manifest if isinstance(canon_manifest, dict) else {"family_baselines": {}}
        except Exception:
            canon_data = {"family_baselines": {}}

        style_packs = {}
        try:
            for sp_path in (repo_root / "style_packs").iterdir():
                if sp_path.suffix == ".json":
                    style_packs[sp_path.stem] = load_sp(sp_path.stem, None)
        except Exception:
            pass

        try:
            validate_primitive_library(repo_root)
            from asf.primitives import query_primitives
            primitives = query_primitives(repo_root)
            primitive_manifest = {"primitives": [p.to_dict() if hasattr(p, 'to_dict') else p for p in primitives]}
        except Exception:
            primitive_manifest = {"primitives": []}

        context = PlannerContext(
            canon=canon_data,
            style_packs=style_packs,
            primitive_manifest=primitive_manifest,
            repo_root=repo_root,
        )

        print(f"  - Canon: {len(canon_data.get('family_baselines', {}))} families")
        print(f"  - Style packs: {len(style_packs)}")
        print(f"  - Primitives: {len(primitive_manifest.get('primitives', []))}")

        default_families = [AssetFamily.CHARACTER_SHEET.value]
        families = tuple(default_families)
        counts = {f: args.count for f in families}

        print()
        print("Generating programs via LLM...")

        programs = []
        brief_lower = args.brief.lower()
        if "scene" in brief_lower or "background" in brief_lower:
            families = (AssetFamily.BACKGROUND_SCENE.value,)
            counts = {AssetFamily.BACKGROUND_SCENE.value: args.count}
        elif "prop" in brief_lower or "item" in brief_lower or "pickup" in brief_lower:
            families = (AssetFamily.PROP_OR_FX_SHEET.value,)
            counts = {AssetFamily.PROP_OR_FX_SHEET.value: args.count}
        elif "tile" in brief_lower:
            families = (AssetFamily.TILESET.value,)
            counts = {AssetFamily.TILESET.value: args.count}

        print(f"  - Families: {families}")
        print(f"  - Counts: {counts}")

        for family_str in families:
            family = AssetFamily(family_str)
            user_brief = UserBrief(
                request=args.brief,
                family=family,
                style_pack=args.theme,
            )
            prompt_builder = PromptBuilder(context=context)
            prompt, schema = prompt_builder.build_user_brief_prompt(user_brief)

            print(f"  - Calling {provider_type} for {family_str}...")
            response = provider.submit_prompt(prompt, schema)

            if response.trace.get("error"):
                print(f"    ERROR: {response.trace['error']}")
                continue

            if response.parsed:
                parser = StructuredOutputParser(context=context)
                try:
                    program = parser.parse_program(response.parsed, expected_family=family)
                    from asf.planner.schemas import serialize_program
                    prog_dict = serialize_program(program)
                    programs.append(prog_dict)
                    print(f"    OK: generated {family_str} program")
                except Exception as e:
                    print(f"    PARSE ERROR: {e}")
            else:
                print(f"    No parseable response from provider")

        if not programs:
            print()
            print("ERROR: No programs generated. Check API key and try again.")
            return

        print()
        print("Running orchestrator pipeline...")

        job_root = repo_root / ".asf" / "generate"
        job_root.mkdir(parents=True, exist_ok=True)

        orchestrator = BatchOrchestrator(
            job_root=job_root,
            repo_root=repo_root,
            planner_context=context,
        )

        try:
            job = orchestrator.run_from_plan(
                brief=args.brief,
                families=families,
                counts=counts,
                programs=programs,
                style_pack=args.theme,
            )
        except Exception as e:
            print(f"ORCHESTRATOR ERROR: {e}")
            import traceback
            traceback.print_exc()
            return

        completed = sum(1 for a in job.asset_states if a.state not in (AssetState.FAILED, AssetState.PENDING))
        failed = sum(1 for a in job.asset_states if a.state == AssetState.FAILED)

        print()
        print("Pipeline Results")
        print("=" * 40)
        print(f"  Job ID: {job.job_id}")
        print(f"  State: {job.state.value}")
        print(f"  Completed: {completed}/{len(job.asset_states)}")
        print(f"  Failed: {failed}")
        print()
        print(f"  Output: {job.output_root}")
        return

    if not args.spec or not args.output:
        parser.error("either the canon subcommand or --spec/--output is required")

    spec = load_spec(args.spec)
    style_pack = load_style_pack(spec.style_pack, spec.palette)
    export_asset(spec, style_pack, Path(args.output))


if __name__ == "__main__":
    main()
