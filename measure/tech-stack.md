# Tech Stack

## Runtime

- Python 3.12

## Core Libraries

- Pillow for deterministic 2D raster rendering and PNG export
- Standard library `json`, `dataclasses`, `pathlib`, and `hashlib`
- Standard library `unittest` for automated tests

## Project Structure

- `src/asf/` for application modules
- `tests/` for unit and integration-style verification
- `style_packs/` for reusable JSON-defined style packs
- `examples/` for schema-compliant entity specifications
- `outputs/` for generated artifacts

## Architectural Choices

- Specifications are parsed into typed dataclasses before rendering.
- Rendering is deterministic and does not rely on stochastic image models.
- Validation is explicit and structural; failed checks block acceptance.
- The initial prototype focuses on one style pack and one humanoid renderer
  path, with extension points for effects and additional entity archetypes.

## Quality Gates

- `python3 -m unittest discover -s tests -v`
- `python3 -m compileall src`
