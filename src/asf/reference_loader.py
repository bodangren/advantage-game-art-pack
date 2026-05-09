"""Reference asset loader for critic calibration with real demo assets."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image

from asf.canon import FAMILY_NAMES
from asf.candidate_loop import _candidate_metrics


@dataclass(frozen=True)
class ReferenceImage:
    """A reference image with computed metrics."""

    family: str
    path: Path
    image: Image.Image
    metrics: dict[str, Any]


class ReferenceAssetLoader:
    """Loads reference images from reference/demo_assets directory for critic calibration."""

    def __init__(
        self,
        reference_dir: Path | None = None,
        repo_root: Path | None = None,
    ) -> None:
        """Initialize the reference asset loader.

        Args:
            reference_dir: Directory containing reference PNGs. Defaults to reference/demo_assets/.
            repo_root: Root directory for the repository. Defaults to cwd.
        """
        self.reference_dir = reference_dir or Path("reference/demo_assets")
        self.repo_root = repo_root or Path.cwd()

    def has_reference(self, family: str) -> bool:
        """Check if a reference exists for the given family.

        Args:
            family: The family name to check.

        Returns:
            True if reference PNG exists, False otherwise.
        """
        if family not in FAMILY_NAMES:
            return False
        ref_path = self.reference_dir / f"{family}_reference.png"
        return ref_path.exists()

    def load_reference_image(self, family: str) -> ReferenceImage | None:
        """Load a reference image for the given family.

        Args:
            family: The family name to load.

        Returns:
            ReferenceImage with image and computed metrics, or None if not found.
        """
        if family not in FAMILY_NAMES:
            return None

        ref_path = self.reference_dir / f"{family}_reference.png"
        if not ref_path.exists():
            return None

        image = Image.open(ref_path).convert("RGBA")
        metrics = self._compute_metrics(image, family)

        return ReferenceImage(
            family=family,
            path=ref_path,
            image=image,
            metrics=metrics,
        )

    def _compute_metrics(self, image: Image.Image, family: str) -> dict[str, Any]:
        """Compute metrics for an image.

        Args:
            image: The PIL Image to compute metrics for.
            family: The family name (used to determine layout type).

        Returns:
            Dictionary of computed metrics.
        """
        layout_type = self._family_to_layout_type(family)
        try:
            return _candidate_metrics(image, layout_type)
        except Exception:
            return {
                "color_count": 0,
                "dominant_color_count": 0,
                "non_transparent_occupancy_ratio": 0.0,
                "edge_density": 0.0,
                "contact_shadow_area": 0,
                "highlight_density": 0.0,
                "frame_to_frame_drift": 0.0,
            }

    def _family_to_layout_type(self, family: str) -> str:
        """Map family name to layout type for metric computation.

        Args:
            family: The family name.

        Returns:
            The appropriate layout type string.
        """
        layout_map = {
            "character_sheet": "pose_sheet_3x3",
            "prop_sheet": "strip_3x1",
            "fx_sheet": "strip_3x1",
            "tileset": "tile_atlas",
            "background_scene": "scene_full_frame",
            "parallax_layer": "atlas_square",
            "ui_sheet": "atlas_square",
            "presentation_surface": "atlas_square",
            "directional_sheet": "directional_grid",
            "effect_sheet": "effect_strip",
            "projectile": "projectile_directional",
            "pickup": "pickup_single",
            "interactable": "interactable_single",
            "book": "book_multistate",
        }
        return layout_map.get(family, "atlas_square")

    def all_references_by_family(self) -> dict[str, list[ReferenceImage]]:
        """Load all references organized by family.

        Returns:
            Dictionary mapping family name to list of ReferenceImages.
        """
        result: dict[str, list[ReferenceImage]] = {family: [] for family in FAMILY_NAMES}

        for family in FAMILY_NAMES:
            ref = self.load_reference_image(family)
            if ref is not None:
                result[family].append(ref)

        return result

    def get_all_references(self) -> list[ReferenceImage]:
        """Get all loaded references as a flat list.

        Returns:
            List of all ReferenceImages.
        """
        all_by_family = self.all_references_by_family()
        result = []
        for refs in all_by_family.values():
            result.extend(refs)
        return result