# Effect Sheet Palette Quantization

## Problem

The effect sheet compiler currently uses a dummy PaletteSpec for style pack loading, meaning actual effect rendering does not apply palette quantization. This causes effect sheets to potentially use more colors than the style pack allows, breaking visual consistency with other asset families.

## Goal

Pass real palette hints from the style pack to effect compilers so that palette quantization is applied to effect sheet output, ensuring all compiled assets respect style_pack palette_limits.

## Scope

### In Scope

- Modify effect sheet compiler to accept and use palette hints from style pack
- Apply median-cut palette quantization to effect sheet output
- Verify effect sheets pass palette-limit structural check
- Update tests to verify palette enforcement on effect sheets

### Out of Scope

- Changes to the effect overlay pipeline (compositing, blend modes)
- Changes to other compiler families

## Success Criteria

- Effect sheet compiler applies palette quantization when rendering
- All effect sheets respect style_pack.palette_limits
- Existing tests pass