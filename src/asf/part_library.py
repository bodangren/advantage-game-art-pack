"""Part library integration for renderer - stamps approved primitives onto canvas."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


@dataclass(frozen=True)
class PartLibraryRef:
    """Reference to a primitive with positioning and scale."""

    primitive_id: str
    x: int
    y: int
    scale: float = 1.0


class PartLibrary:
    """Loads and stamps approved primitives onto rendered canvases."""

    def __init__(self, repo_root: str | Path) -> None:
        self._repo_root = Path(repo_root)
        manifest_path = self._repo_root / "library" / "primitive_manifest.json"
        with manifest_path.open("r", encoding="utf-8") as f:
            import json
            self._manifest = json.load(f)
        self._cache: dict[str, Image.Image] = {}

    def _resolve_primitive_source_path(self, primitive_id: str) -> Path | None:
        for row in self._manifest.get("primitives", []):
            if row.get("primitive_id") == primitive_id:
                return self._repo_root / row.get("source_path", "")
        return None

    def _load_primitive_image(self, primitive_id: str) -> Image.Image | None:
        if primitive_id in self._cache:
            return self._cache[primitive_id]

        source_path = self._resolve_primitive_source_path(primitive_id)
        if source_path is None or not source_path.exists():
            return None

        image = Image.open(source_path).convert("RGBA")
        self._cache[primitive_id] = image
        return image

    def stamp_primitive(
        self,
        canvas: Image.Image,
        primitive_id: str,
        x: int,
        y: int,
        *,
        scale: float = 1.0,
    ) -> None:
        """Composite a primitive onto the canvas at the specified position."""
        image = self._load_primitive_image(primitive_id)
        if image is None:
            return

        new_width = int(image.width * scale)
        new_height = int(image.height * scale)
        if new_width == 0 or new_height == 0:
            return

        resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        canvas.alpha_composite(resized, (x, y))

    def stamp_ref(self, canvas: Image.Image, ref: PartLibraryRef) -> None:
        """Stamp a PartLibraryRef onto the canvas."""
        self.stamp_primitive(canvas, ref.primitive_id, ref.x, ref.y, scale=ref.scale)

    def stamp_refs(
        self, canvas: Image.Image, refs: list[PartLibraryRef]
    ) -> None:
        """Stamp multiple PartLibraryRefs onto the canvas."""
        for ref in refs:
            self.stamp_ref(canvas, ref)


def parse_part_library_refs(payload: dict[str, Any]) -> list[PartLibraryRef]:
    """Parse part_library_refs from a spec payload."""
    raw_refs = payload.get("part_library_refs")
    if raw_refs is None:
        return []
    if not isinstance(raw_refs, list):
        return []
    refs = []
    for entry in raw_refs:
        if not isinstance(entry, dict):
            continue
        primitive_id = entry.get("primitive_id")
        if not isinstance(primitive_id, str) or not primitive_id:
            continue
        x = entry.get("x", 0)
        y = entry.get("y", 0)
        scale = entry.get("scale", 1.0)
        refs.append(PartLibraryRef(
            primitive_id=primitive_id,
            x=x,
            y=y,
            scale=scale,
        ))
    return refs