"""Deterministic 64x64 frame and 3x3 sheet renderer."""

from __future__ import annotations

from dataclasses import dataclass
import io
from typing import Callable

from PIL import Image, ImageDraw

from asf.part_library import PartLibrary
from asf.specs import PoseSpec, SpriteSpec
from asf.style_packs import StylePack


FRAME_ORDER = ("idle", "walk", "action")
FRAME_SIZE = (64, 64)


@dataclass(frozen=True)
class FramePose:
    """Per-frame offsets used to animate a rendered sprite."""

    head_shift: int
    torso_shift: int
    limb_shift: int
    swing: int


def render_sheet(
    spec: SpriteSpec,
    style_pack: StylePack,
    *,
    part_library: PartLibrary | None = None,
) -> Image.Image:
    """Renders a deterministic 3x3 sprite sheet for a given spec."""

    sheet = Image.new("RGBA", (FRAME_SIZE[0] * 3, FRAME_SIZE[1] * 3), (0, 0, 0, 0))
    frame_index = 0
    for animation in FRAME_ORDER:
        for local_index in range(3):
            frame = render_frame(spec, style_pack, animation, local_index, part_library=part_library)
            x = (frame_index % 3) * FRAME_SIZE[0]
            y = (frame_index // 3) * FRAME_SIZE[1]
            sheet.alpha_composite(frame, (x, y))
            frame_index += 1
    return sheet


def render_frame(
    spec: SpriteSpec,
    style_pack: StylePack,
    animation: str,
    frame_index: int,
    *,
    part_library: PartLibrary | None = None,
) -> Image.Image:
    """Renders a single 64x64 frame with bounded pose offsets."""

    image = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    colors = _resolve_colors(spec, style_pack)
    pose = _pose_for(spec.pose, animation, frame_index, style_pack.animation_rules.max_offset)

    painter = _painter_for(spec.body.archetype)
    painter(draw, spec, colors, pose, animation, frame_index, style_pack)

    if spec.fx.type:
        _draw_fx(draw, spec.fx.type, colors["accent_light"], animation, frame_index)

    if part_library is not None and spec.part_library_refs:
        part_library.stamp_refs(image, list(spec.part_library_refs))

    return image


def render_png_bytes(
    spec: SpriteSpec,
    style_pack: StylePack,
    *,
    part_library: PartLibrary | None = None,
) -> bytes:
    """Renders a sheet and returns stable PNG bytes."""

    image = render_sheet(spec, style_pack, part_library=part_library)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=False, compress_level=9)
    return buffer.getvalue()


def _resolve_colors(spec: SpriteSpec, style_pack: StylePack) -> dict[str, str]:
    primary = style_pack.ramp(spec.palette.primary)
    secondary = style_pack.ramp(spec.palette.secondary)
    accent = style_pack.ramp(spec.palette.accent)
    return {
        "primary_light": primary[0],
        "primary_mid": primary[1],
        "primary_shadow": primary[2],
        "secondary_light": secondary[0],
        "secondary_mid": secondary[1],
        "secondary_shadow": secondary[2],
        "accent_light": accent[0],
        "accent_mid": accent[1],
        "accent_shadow": accent[2],
        "outline": style_pack.outline.color,
    }


def _pose_for(
    pose_spec: PoseSpec,
    animation: str,
    frame_index: int,
    max_offset: int,
) -> FramePose:
    sequence = getattr(pose_spec, animation)
    if sequence:
        torso_shift = sequence[frame_index]
    else:
        defaults = {
            "idle": (0, -1, 0),
            "walk": (-max_offset, 0, max_offset),
            "action": (0, -max_offset, 0),
        }
        torso_shift = defaults[animation][frame_index]
    torso_shift = max(-max_offset, min(max_offset, torso_shift))
    head_shift = torso_shift // 2
    if animation == "action" and frame_index == 1:
        head_shift -= 1
    limb_shift = min(max_offset, abs(torso_shift) + (1 if animation == "walk" and frame_index != 1 else 0))
    swing = (-1, 0, 1)[frame_index] * max(1, max_offset // 2)
    return FramePose(
        head_shift=head_shift,
        torso_shift=torso_shift,
        limb_shift=limb_shift,
        swing=swing,
    )


def _painter_for(archetype: str) -> Callable[
    [ImageDraw.ImageDraw, SpriteSpec, dict[str, str], FramePose, str, int, StylePack],
    None,
]:
    if "slime" in archetype:
        return _render_slime
    if "armored" in archetype:
        return _render_armored
    if "ragged" in archetype:
        return _render_ragged
    return _render_generic


def _render_generic(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
) -> None:
    _draw_shadow(draw, 18, 50, 46, 58)
    _draw_humanoid_body(draw, spec, colors, pose, animation, frame_index, style_pack, "generic")


def _render_armored(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
) -> None:
    _draw_shadow(draw, 17, 50, 47, 59)
    _draw_humanoid_body(draw, spec, colors, pose, animation, frame_index, style_pack, "armored")


def _render_ragged(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
) -> None:
    _draw_shadow(draw, 18, 51, 46, 59)
    _draw_humanoid_body(draw, spec, colors, pose, animation, frame_index, style_pack, "ragged")


def _render_slime(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
) -> None:
    slime_shift = pose.torso_shift
    body = (9, 18 + slime_shift, 55, 53 + slime_shift)
    puddle = (7, 46 + slime_shift, 57, 60 + slime_shift)

    draw.ellipse(puddle, fill=(255, 255, 255, 40))
    draw.ellipse((11, 20 + slime_shift, 53, 53 + slime_shift), fill=colors["primary_shadow"])
    draw.pieslice(body, start=180, end=360, fill=colors["primary_mid"])
    draw.ellipse((12, 22 + slime_shift, 52, 50 + slime_shift), fill=colors["primary_mid"])
    draw.ellipse((18, 26 + slime_shift, 43, 44 + slime_shift), fill=colors["primary_light"])
    draw.ellipse((27, 31 + slime_shift, 39, 43 + slime_shift), fill=colors["accent_shadow"])
    draw.ellipse((30, 33 + slime_shift, 37, 40 + slime_shift), fill="#fff6b8")
    draw.ellipse((18, 23 + slime_shift, 28, 30 + slime_shift), fill="#ffffff")
    draw.ellipse((35, 22 + slime_shift, 42, 28 + slime_shift), fill="#ffffff")
    draw.arc((13, 29 + slime_shift, 51, 52 + slime_shift), 200, 340, fill=colors["secondary_shadow"], width=2)

    if animation == "walk":
        sway = (-4, 0, 4)[frame_index]
        draw.polygon(
            [(9 + sway, 43 + slime_shift), (4 + sway, 50 + slime_shift), (15 + sway, 53 + slime_shift)],
            fill=colors["primary_mid"],
        )
        draw.polygon(
            [(55 + sway, 43 + slime_shift), (60 + sway, 50 + slime_shift), (49 + sway, 53 + slime_shift)],
            fill=colors["primary_mid"],
        )
    if animation == "action":
        for droplet in _droplets_for(frame_index, slime_shift):
            draw.ellipse(droplet, fill=colors["accent_light"])

    if style_pack.outline.enabled:
        outline = style_pack.outline.color
        draw.arc((8, 18 + slime_shift, 56, 54 + slime_shift), 180, 360, fill=outline, width=1)
        draw.arc((10, 18 + slime_shift, 54, 52 + slime_shift), 180, 355, fill=outline, width=1)
        draw.arc(puddle, 180, 360, fill=outline, width=1)


def _draw_humanoid_body(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
    variant: str,
) -> None:
    head_scale = spec.body.head_scale
    torso_scale = spec.body.torso_scale
    leg_length = spec.body.leg_length

    head_width = _scaled(22, head_scale, minimum=18)
    head_height = _scaled(21, head_scale, minimum=17)
    torso_width = _scaled(22, torso_scale, minimum=18)
    torso_height = _scaled(19, torso_scale, minimum=16)
    shoulder_width = torso_width + 8

    torso_top = 24 + pose.torso_shift
    head_top = 7 + pose.head_shift
    leg_top = 39 + pose.torso_shift
    leg_bottom = min(55, leg_top + max(leg_length, 10))

    head_box = _center_box(32, head_top + head_height // 2, head_width, head_height)
    torso_box = _center_box(32, torso_top + torso_height // 2, torso_width, torso_height)
    shoulder_box = _center_box(32, torso_top + 6, shoulder_width, max(8, torso_height // 2))
    left_leg = _center_box(25 + pose.limb_shift // 2, (leg_top + leg_bottom) // 2, 8, leg_bottom - leg_top)
    right_leg = _center_box(39 - pose.limb_shift // 2, (leg_top + leg_bottom) // 2, 8, leg_bottom - leg_top)
    left_arm = _center_box(18 - pose.swing, 30 + pose.torso_shift, 7, 14)
    right_arm = _center_box(46 + pose.swing, 30 + pose.torso_shift, 7, 14)

    _draw_body_shadow(draw, torso_box, left_leg, right_leg)
    _draw_legs(draw, colors, left_leg, right_leg, variant, pose, style_pack)
    _draw_torso(draw, colors, torso_box, shoulder_box, variant, pose, style_pack)
    _draw_head(draw, colors, head_box, variant, spec.parts["head"], pose, style_pack)
    _draw_arms(draw, colors, left_arm, right_arm, variant, pose, style_pack)
    _draw_equipment(draw, spec, colors, pose, animation, frame_index, variant, style_pack)
    _draw_face(draw, colors, head_box, variant, pose)
    if spec.fx.type:
        _draw_fx(draw, spec.fx.type, colors["accent_mid"], animation, frame_index)

    if style_pack.outline.enabled:
        _draw_outline(draw, colors["outline"], head_box, torso_box, left_leg, right_leg, variant, pose)


def _draw_body_shadow(
    draw: ImageDraw.ImageDraw,
    torso_box: tuple[int, int, int, int],
    left_leg: tuple[int, int, int, int],
    right_leg: tuple[int, int, int, int],
) -> None:
    shadow_left = min(torso_box[0], left_leg[0]) + 1
    shadow_top = torso_box[3] - 1
    shadow_right = max(torso_box[2], right_leg[2]) - 1
    shadow_bottom = max(left_leg[3], right_leg[3]) + 2
    draw.ellipse((shadow_left, shadow_top, shadow_right, shadow_bottom), fill=(0, 0, 0, 44))


def _draw_torso(
    draw: ImageDraw.ImageDraw,
    colors: dict[str, str],
    torso_box: tuple[int, int, int, int],
    shoulder_box: tuple[int, int, int, int],
    variant: str,
    pose: FramePose,
    style_pack: StylePack,
) -> None:
    if variant == "armored":
        draw.rounded_rectangle(shoulder_box, radius=4, fill=colors["secondary_mid"])
        draw.rounded_rectangle(torso_box, radius=4, fill=colors["primary_mid"])
        inset = (torso_box[0] + 2, torso_box[1] + 2, torso_box[2] - 2, torso_box[3] - 2)
        draw.rounded_rectangle(inset, radius=3, fill=colors["primary_light"])
        draw.line((torso_box[0] + 2, torso_box[1] + 6, torso_box[2] - 2, torso_box[1] + 6), fill=colors["accent_light"], width=2)
    elif variant == "ragged":
        draw.rounded_rectangle(shoulder_box, radius=4, fill=colors["secondary_shadow"])
        draw.rounded_rectangle(torso_box, radius=3, fill=colors["secondary_mid"])
        skirt = (torso_box[0] + 2, torso_box[3] - 2, torso_box[2] - 2, torso_box[3] + 4)
        draw.polygon(
            [
                (skirt[0], skirt[1]),
                (skirt[0] + 4, skirt[3]),
                (torso_box[0] + 9, skirt[1]),
                (torso_box[0] + 13, skirt[3]),
                (torso_box[2] - 13, skirt[1]),
                (torso_box[2] - 9, skirt[3]),
                (skirt[2], skirt[1]),
                (skirt[2] - 4, skirt[3]),
            ],
            fill=colors["secondary_shadow"],
        )
        draw.line((torso_box[0] + 3, torso_box[1] + 3, torso_box[2] - 3, torso_box[3] - 1), fill=colors["accent_shadow"], width=1)
    else:
        draw.rounded_rectangle(shoulder_box, radius=4, fill=colors["secondary_mid"])
        draw.rounded_rectangle(torso_box, radius=4, fill=colors["secondary_shadow"])
        draw.rectangle(
            (torso_box[0] + 2, torso_box[1] + 2, torso_box[2] - 2, torso_box[1] + 6),
            fill=colors["secondary_light"],
        )


def _draw_head(
    draw: ImageDraw.ImageDraw,
    colors: dict[str, str],
    head_box: tuple[int, int, int, int],
    variant: str,
    head_part: str,
    pose: FramePose,
    style_pack: StylePack,
) -> None:
    if "slime" in head_part:
        return
    if variant == "armored" or "helmet" in head_part:
        helmet = (
            head_box[0] - 1,
            head_box[1] - 1,
            head_box[2] + 1,
            head_box[3] + 1,
        )
        draw.rounded_rectangle(helmet, radius=8, fill=colors["primary_shadow"])
        visor = (head_box[0] + 4, head_box[1] + 8, head_box[2] - 4, head_box[1] + 14)
        draw.rounded_rectangle(visor, radius=3, fill=colors["accent_shadow"])
        crest = (head_box[0] + 8, head_box[1] - 3, head_box[2] - 8, head_box[1] + 4)
        draw.rectangle(crest, fill=colors["accent_light"])
        return
    if variant == "ragged" or "messy" in head_part:
        draw.ellipse(head_box, fill=colors["primary_light"])
        hair = (
            head_box[0] - 1,
            head_box[1] - 1,
            head_box[2] + 1,
            head_box[3] - 2,
        )
        draw.pieslice(hair, start=200, end=340, fill=colors["accent_shadow"])
        draw.rectangle((head_box[0] + 2, head_box[1] + 1, head_box[2] - 2, head_box[1] + 8), fill=colors["accent_shadow"])
        return
    draw.rounded_rectangle(head_box, radius=8, fill=colors["primary_light"])
    draw.rectangle((head_box[0] + 3, head_box[1] + 4, head_box[2] - 3, head_box[1] + 8), fill=colors["primary_mid"])


def _draw_face(
    draw: ImageDraw.ImageDraw,
    colors: dict[str, str],
    head_box: tuple[int, int, int, int],
    variant: str,
    pose: FramePose,
) -> None:
    eye_y = head_box[1] + 6
    if variant == "armored":
        draw.rectangle((head_box[0] + 5, eye_y, head_box[0] + 10, eye_y + 2), fill="#ffffff")
        draw.rectangle((head_box[2] - 10, eye_y, head_box[2] - 5, eye_y + 2), fill="#ffffff")
        return
    if variant == "ragged":
        draw.rectangle((head_box[0] + 5, eye_y + 1, head_box[0] + 8, eye_y + 2), fill="#ffffff")
        draw.rectangle((head_box[2] - 8, eye_y + 1, head_box[2] - 5, eye_y + 2), fill="#ffffff")
        draw.line((head_box[0] + 8, head_box[3] - 7, head_box[2] - 8, head_box[3] - 7), fill=colors["accent_shadow"], width=1)
        return
    draw.ellipse((head_box[0] + 5, eye_y, head_box[0] + 9, eye_y + 4), fill="#ffffff")
    draw.ellipse((head_box[2] - 9, eye_y, head_box[2] - 5, eye_y + 4), fill="#ffffff")
    if pose.torso_shift < 0:
        draw.line((head_box[0] + 9, head_box[3] - 7, head_box[2] - 9, head_box[3] - 7), fill=colors["primary_shadow"], width=1)
    else:
        draw.line((head_box[0] + 8, head_box[3] - 8, head_box[2] - 8, head_box[3] - 8), fill=colors["primary_shadow"], width=1)


def _draw_arms(
    draw: ImageDraw.ImageDraw,
    colors: dict[str, str],
    left_arm: tuple[int, int, int, int],
    right_arm: tuple[int, int, int, int],
    variant: str,
    pose: FramePose,
    style_pack: StylePack,
) -> None:
    if variant == "armored":
        draw.rounded_rectangle(left_arm, radius=2, fill=colors["secondary_shadow"])
        draw.rounded_rectangle(right_arm, radius=2, fill=colors["secondary_mid"])
        draw.rectangle((left_arm[0] - 1, left_arm[3] - 2, left_arm[2] + 1, left_arm[3] + 2), fill=colors["accent_shadow"])
        draw.rectangle((right_arm[0] - 1, right_arm[3] - 2, right_arm[2] + 1, right_arm[3] + 2), fill=colors["accent_shadow"])
    elif variant == "ragged":
        draw.rectangle(left_arm, fill=colors["secondary_shadow"])
        draw.rectangle(right_arm, fill=colors["secondary_shadow"])
        draw.line((left_arm[0], left_arm[1], left_arm[2], left_arm[3]), fill=colors["accent_shadow"], width=1)
        draw.line((right_arm[0], right_arm[1], right_arm[2], right_arm[3]), fill=colors["accent_shadow"], width=1)
    else:
        draw.rounded_rectangle(left_arm, radius=2, fill=colors["secondary_shadow"])
        draw.rounded_rectangle(right_arm, radius=2, fill=colors["secondary_shadow"])


def _draw_legs(
    draw: ImageDraw.ImageDraw,
    colors: dict[str, str],
    left_leg: tuple[int, int, int, int],
    right_leg: tuple[int, int, int, int],
    variant: str,
    pose: FramePose,
    style_pack: StylePack,
) -> None:
    if variant == "armored":
        draw.rounded_rectangle(left_leg, radius=2, fill=colors["primary_shadow"])
        draw.rounded_rectangle(right_leg, radius=2, fill=colors["primary_mid"])
        draw.rectangle((left_leg[0], left_leg[3] - 3, left_leg[2], left_leg[3]), fill=colors["accent_shadow"])
        draw.rectangle((right_leg[0], right_leg[3] - 3, right_leg[2], right_leg[3]), fill=colors["accent_shadow"])
    elif variant == "ragged":
        draw.rectangle(left_leg, fill=colors["primary_light"])
        draw.rectangle(right_leg, fill=colors["primary_mid"])
        draw.line((left_leg[0], left_leg[1], left_leg[0], left_leg[3]), fill=colors["accent_shadow"], width=1)
        draw.line((right_leg[2], right_leg[1], right_leg[2], right_leg[3]), fill=colors["accent_shadow"], width=1)
    else:
        draw.rounded_rectangle(left_leg, radius=2, fill=colors["primary_shadow"])
        draw.rounded_rectangle(right_leg, radius=2, fill=colors["primary_mid"])


def _draw_equipment(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: FramePose,
    animation: str,
    frame_index: int,
    variant: str,
    style_pack: StylePack,
) -> None:
    if spec.equipment.main_hand:
        if "spear" in spec.equipment.main_hand:
            shaft = (45 + pose.swing, 26 + pose.torso_shift, 47 + pose.swing, 48 + pose.torso_shift)
            head = (42 + pose.swing, 22 + pose.torso_shift, 50 + pose.swing, 28 + pose.torso_shift)
            draw.rectangle(shaft, fill=colors["accent_shadow"])
            draw.polygon(
                [
                    (head[0] + 4, head[1]),
                    (head[2], head[1] + 5),
                    (head[0] + 4, head[3]),
                    (head[0], head[1] + 5),
                ],
                fill=colors["accent_light"],
            )
        else:
            blade = (42 + pose.swing, 25 + pose.torso_shift, 46 + pose.swing, 43 + pose.torso_shift)
            hilt = (41 + pose.swing, 39 + pose.torso_shift, 47 + pose.swing, 42 + pose.torso_shift)
            draw.rectangle(blade, fill=colors["accent_light"])
            draw.rectangle(hilt, fill=colors["accent_shadow"])

    if spec.equipment.off_hand:
        if "shield" in spec.equipment.off_hand:
            shield = (12 - pose.swing, 27 + pose.torso_shift, 24 - pose.swing, 40 + pose.torso_shift)
            draw.rounded_rectangle(shield, radius=3, fill=colors["accent_light"])
            draw.rounded_rectangle(
                (shield[0] + 2, shield[1] + 2, shield[2] - 2, shield[3] - 2),
                radius=2,
                fill=colors["accent_shadow"],
            )
        else:
            focus = (13 - pose.swing, 30 + pose.torso_shift, 22 - pose.swing, 39 + pose.torso_shift)
            draw.ellipse(focus, fill=colors["accent_light"])


def _draw_outline(
    draw: ImageDraw.ImageDraw,
    color: str,
    head_box: tuple[int, int, int, int],
    torso_box: tuple[int, int, int, int],
    left_leg: tuple[int, int, int, int],
    right_leg: tuple[int, int, int, int],
    variant: str,
    pose: FramePose,
) -> None:
    if variant == "armored":
        draw.rounded_rectangle(
            (head_box[0] - 1, head_box[1] - 1, head_box[2] + 1, head_box[3] + 1),
            radius=8,
            outline=color,
            width=1,
        )
        draw.rounded_rectangle(torso_box, radius=4, outline=color, width=1)
        draw.rounded_rectangle(left_leg, radius=2, outline=color, width=1)
        draw.rounded_rectangle(right_leg, radius=2, outline=color, width=1)
        return
    if variant == "ragged":
        draw.ellipse(head_box, outline=color, width=1)
        draw.rounded_rectangle(torso_box, radius=3, outline=color, width=1)
        draw.line((left_leg[0], left_leg[1], left_leg[0], left_leg[3]), fill=color, width=1)
        draw.line((right_leg[2], right_leg[1], right_leg[2], right_leg[3]), fill=color, width=1)
        return
    draw.rounded_rectangle(head_box, radius=8, outline=color, width=1)
    draw.rounded_rectangle(torso_box, radius=4, outline=color, width=1)
    draw.rounded_rectangle(left_leg, radius=2, outline=color, width=1)
    draw.rounded_rectangle(right_leg, radius=2, outline=color, width=1)


def _draw_fx(
    draw: ImageDraw.ImageDraw,
    fx_type: str,
    color: str,
    animation: str,
    frame_index: int,
) -> None:
    if fx_type == "poison_aura":
        aura_offset = (-1, 0, 1)[frame_index]
        draw.arc((8, 8 + aura_offset, 56, 56 + aura_offset), 25, 155, fill=color, width=2)
        draw.arc((10, 10 - aura_offset, 54, 54 - aura_offset), 210, 330, fill=color, width=2)
        if animation == "action":
            draw.ellipse((8, 20, 12, 24), fill=color)
            draw.ellipse((50, 16, 55, 21), fill=color)
            draw.ellipse((46, 48, 51, 53), fill=color)
    else:
        glow = (14, 14, 50, 50)
        draw.ellipse(glow, outline=color, width=1)


def _draw_shadow(draw: ImageDraw.ImageDraw, left: int, top: int, right: int, bottom: int) -> None:
    draw.ellipse((left, top, right, bottom), fill=(0, 0, 0, 48))


def _scaled(base: int, scale: float, *, minimum: int) -> int:
    return max(minimum, int(round(base * scale)))


def _center_box(cx: int, cy: int, width: int, height: int) -> tuple[int, int, int, int]:
    left = cx - width // 2
    top = cy - height // 2
    return (left, top, left + width, top + height)


def _droplets_for(frame_index: int, slime_shift: int) -> list[tuple[int, int, int, int]]:
    if frame_index == 0:
        return [
            (9, 17 + slime_shift, 14, 22 + slime_shift),
            (48, 12 + slime_shift, 54, 18 + slime_shift),
        ]
    if frame_index == 1:
        return [
            (6, 15 + slime_shift, 14, 23 + slime_shift),
            (46, 10 + slime_shift, 56, 20 + slime_shift),
            (52, 20 + slime_shift, 58, 26 + slime_shift),
        ]
    return [
        (4, 14 + slime_shift, 15, 25 + slime_shift),
        (44, 9 + slime_shift, 58, 23 + slime_shift),
        (54, 26 + slime_shift, 60, 32 + slime_shift),
    ]
