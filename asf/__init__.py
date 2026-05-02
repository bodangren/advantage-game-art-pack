"""Root package shim for the src-layout ASF package."""

from __future__ import annotations

from pathlib import Path


_SRC_PACKAGE = Path(__file__).resolve().parent.parent / "src" / "asf"
__path__.append(str(_SRC_PACKAGE))

from asf.compilers import (  # noqa: E402
    CHARACTER_DIRECTION_NAMES,
    COMPILER_VERSION,
    DEFAULT_COMPILER_REGISTRY,
    OUTPUT_ROOT_DIRNAME,
    PROGRAM_ROOT_DIRNAME,
    CharacterSheetProgram,
    CompilerDefinition,
    CompilerOutputManifest,
    CompilerProgramBase,
    CompilerRegistry,
    CompilerValidationError,
    DirectionalSheetProgram,
    EffectSheetProgram,
    MotionPlan,
    PaletteSpec,
    ProgramLayout,
    PropOrFxSheetProgram,
    TilesetProgram,
    VariantControls,
    VariationRules,
    build_output_manifest,
    compile_program,
    load_compiler_program,
)

__all__ = [
    "CHARACTER_DIRECTION_NAMES",
    "COMPILER_VERSION",
    "DEFAULT_COMPILER_REGISTRY",
    "OUTPUT_ROOT_DIRNAME",
    "PROGRAM_ROOT_DIRNAME",
    "CharacterSheetProgram",
    "CompilerDefinition",
    "CompilerOutputManifest",
    "CompilerProgramBase",
    "CompilerRegistry",
    "CompilerValidationError",
    "DirectionalSheetProgram",
    "EffectSheetProgram",
    "MotionPlan",
    "PaletteSpec",
    "ProgramLayout",
    "PropOrFxSheetProgram",
    "TilesetProgram",
    "VariantControls",
    "VariationRules",
    "build_output_manifest",
    "compile_program",
    "load_compiler_program",
]
