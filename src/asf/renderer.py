"""Deterministic 64x64 frame and 3x3 sheet renderer."""

from __future__ import annotations

from dataclasses import dataclass
import io

from PIL import Image, ImageDraw

from asf.specs import SpriteSpec
from asf.style_packs import StylePack


FRAME_LAYOUT = ("idle", "walk", "action")
FRAME_SIZE = (64, 64)


@dataclass(frozen=True)
class PoseState:
    """Per-frame offsets used to animate a rendered sprite."""

    head_y: int
    torso_y: int
    arms_x: int
    item_tilt: int


def render_sheet(spec: SpriteSpec, style_pack: StylePack) -> Image.Image:
    """Renders a deterministic 3x3 sprite sheet for a given spec."""

    sheet = Image.new("RGBA", (FRAME_SIZE[0] * 3, FRAME_SIZE[1] * 3), (0, 0, 0, 0))
    frame_index = 0
    for animation in FRAME_LAYOUT:
        for local_index in range(3):
            frame = render_frame(spec, style_pack, animation, local_index)
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
) -> Image.Image:
    """Renders a single 64x64 frame with bounded pose offsets."""

    image = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    colors = _resolve_colors(spec, style_pack)
    pose = _pose_for(animation, frame_index, style_pack.animation_rules.max_offset)
    if "slime" in spec.body.archetype:
        _render_slime(draw, spec, colors, pose, animation, frame_index, style_pack)
    else:
        _render_humanoid(draw, spec, colors, pose, style_pack)
    if spec.fx_type:
        _draw_fx(draw, spec.fx_type, colors["accent_light"], animation, frame_index)
    return image


def render_png_bytes(spec: SpriteSpec, style_pack: StylePack) -> bytes:
    """Renders a sheet and returns stable PNG bytes."""

    image = render_sheet(spec, style_pack)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _resolve_colors(spec: SpriteSpec, style_pack: StylePack) -> dict[str, str]:
    primary = style_pack.ramps[spec.palette.primary]
    secondary = style_pack.ramps[spec.palette.secondary]
    accent = style_pack.ramps[spec.palette.accent]
    return {
        "primary_light": primary[0],
        "primary_mid": primary[1],
        "primary_shadow": primary[2],
        "secondary_mid": secondary[1],
        "secondary_shadow": secondary[2],
        "accent_light": accent[0],
        "accent_shadow": accent[-1],
    }


def _render_humanoid(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: PoseState,
    style_pack: StylePack,
) -> None:
    draw.ellipse((18, 53, 46, 60), fill=(0, 0, 0, 60))
    leg_left = (24, 36 + pose.torso_y, 30, 54)
    leg_right = (34, 36 + pose.torso_y, 40, 54)
    torso = (20, 23 + pose.torso_y, 44, 41 + pose.torso_y)
    head = (18, 7 + pose.head_y, 46, 29 + pose.head_y)
    arm_y = 27 + pose.torso_y

    draw.rounded_rectangle(torso, radius=4, fill=colors["secondary_mid"])
    draw.rounded_rectangle((22, 24 + pose.torso_y, 40, 29 + pose.torso_y),
                           radius=2, fill=colors["secondary_shadow"])
    draw.rounded_rectangle(leg_left, radius=2, fill=colors["primary_shadow"])
    draw.rounded_rectangle(leg_right, radius=2, fill=colors["primary_mid"])
    draw.rounded_rectangle(head, radius=8, fill=colors["primary_light"])
    draw.ellipse((21, 9 + pose.head_y, 33, 17 + pose.head_y),
                 fill="#ffffff")
    draw.rectangle((18 + pose.arms_x, arm_y, 25 + pose.arms_x, arm_y + 15),
                   fill=colors["secondary_shadow"])
    draw.rectangle((39 - pose.arms_x, arm_y, 46 - pose.arms_x, arm_y + 15),
                   fill=colors["secondary_shadow"])
    draw.rectangle((27, 15 + pose.head_y, 31, 17 + pose.head_y),
                   fill=colors["accent_shadow"])
    draw.rectangle((34, 15 + pose.head_y, 38, 17 + pose.head_y),
                   fill=colors["accent_shadow"])
    draw.rectangle((23, 31 + pose.torso_y, 41, 34 + pose.torso_y),
                   fill=colors["primary_light"])

    _draw_equipment(draw, spec, colors, pose, style_pack)
    if style_pack.outline.enabled:
        _draw_outline(draw, pose, style_pack)


def _render_slime(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: PoseState,
    animation: str,
    frame_index: int,
    style_pack: StylePack,
) -> None:
    slime_shift = pose.torso_y
    body = (8, 18 + slime_shift, 56, 54 + slime_shift)
    puddle = (6, 46 + slime_shift, 58, 60 + slime_shift)

    draw.ellipse(puddle, fill=(255, 255, 255, 48))
    draw.ellipse((10, 20 + slime_shift, 54, 54 + slime_shift),
                 fill=colors["primary_shadow"])
    draw.pieslice(body, start=180, end=360, fill=colors["primary_mid"])
    draw.ellipse((12, 22 + slime_shift, 52, 50 + slime_shift),
                 fill=colors["primary_mid"])
    draw.ellipse((18, 26 + slime_shift, 42, 44 + slime_shift),
                 fill=colors["primary_light"])
    draw.ellipse((28, 31 + slime_shift, 40, 43 + slime_shift),
                 fill=colors["accent_shadow"])
    draw.ellipse((30, 33 + slime_shift, 38, 41 + slime_shift),
                 fill="#fff6b8")
    draw.ellipse((18, 23 + slime_shift, 28, 30 + slime_shift),
                 fill="#ffffff")
    draw.ellipse((34, 21 + slime_shift, 41, 26 + slime_shift),
                 fill="#ffffff")
    draw.arc((13, 29 + slime_shift, 51, 52 + slime_shift), 200, 340,
             fill=colors["secondary_shadow"], width=2)

    if animation == "walk":
        sway = (-4, 0, 4)[frame_index]
        draw.polygon(
            [(9 + sway, 43 + slime_shift), (3 + sway, 50 + slime_shift),
             (14 + sway, 53 + slime_shift)],
            fill=colors["primary_mid"],
        )
        draw.polygon(
            [(55 + sway, 43 + slime_shift), (61 + sway, 50 + slime_shift),
             (50 + sway, 53 + slime_shift)],
            fill=colors["primary_mid"],
        )
    if animation == "action":
        for droplet in _droplets_for(frame_index, slime_shift):
            draw.ellipse(droplet, fill=colors["accent_light"])

    if style_pack.outline.enabled:
        draw.arc((8, 18 + slime_shift, 56, 54 + slime_shift), 180, 360,
                 fill=style_pack.outline.color, width=1)
        draw.arc((10, 18 + slime_shift, 54, 52 + slime_shift), 180, 355,
                 fill=style_pack.outline.color, width=1)
        draw.arc(puddle, 180, 360, fill=style_pack.outline.color, width=1)


def _pose_for(animation: str, frame_index: int, max_offset: int) -> PoseState:
    offsets = {
        "idle": [0, -1, 0],
        "walk": [-max_offset, 0, max_offset],
        "action": [0, -max_offset, 0],
    }[animation]
    torso_y = offsets[frame_index]
    head_y = -1 if animation == "action" and frame_index == 1 else torso_y // 2
    arms_x = min(max_offset, abs(offsets[frame_index]))
    item_tilt = 6 if animation == "action" else 0
    return PoseState(
        head_y=head_y,
        torso_y=torso_y,
        arms_x=arms_x,
        item_tilt=item_tilt,
    )


def _draw_equipment(
    draw: ImageDraw.ImageDraw,
    spec: SpriteSpec,
    colors: dict[str, str],
    pose: PoseState,
    style_pack: StylePack,
) -> None:
    if spec.equipment.main_hand:
        blade = (43, 26 + pose.torso_y, 47, 44 + pose.torso_y)
        draw.rectangle(blade, fill=colors["accent_light"])
        draw.rectangle((42, 40 + pose.torso_y, 48, 43 + pose.torso_y),
                       fill=colors["accent_shadow"])
    if spec.equipment.off_hand:
        shield = (14, 28 + pose.torso_y, 23, 40 + pose.torso_y)
        draw.rounded_rectangle(shield, radius=2, fill=colors["accent_light"])
        if style_pack.outline.enabled:
            draw.rounded_rectangle(
                shield,
                radius=2,
                outline=style_pack.outline.color,
                width=1,
            )


def _draw_fx(
    draw: ImageDraw.ImageDraw,
    fx_type: str,
    color: str,
    animation: str,
    frame_index: int,
) -> None:
    if fx_type == "poison_aura":
        aura_offset = (-1, 0, 1)[frame_index]
        draw.arc((8, 8 + aura_offset, 56, 56 + aura_offset),
                 25, 155, fill=color, width=2)
        draw.arc((10, 10 - aura_offset, 54, 54 - aura_offset),
                 210, 330, fill=color, width=2)
        if animation == "action":
            draw.ellipse((8, 20, 12, 24), fill=color)
            draw.ellipse((50, 16, 55, 21), fill=color)
            draw.ellipse((46, 48, 51, 53), fill=color)


def _draw_outline(
    draw: ImageDraw.ImageDraw,
    pose: PoseState,
    style_pack: StylePack,
) -> None:
    color = style_pack.outline.color
    width = style_pack.outline.thickness
    draw.rounded_rectangle(
        (20, 8 + pose.head_y, 44, 28 + pose.head_y),
        radius=7,
        outline=color,
        width=width,
    )
    draw.rounded_rectangle(
        (21, 23 + pose.torso_y, 43, 40 + pose.torso_y),
        radius=3,
        outline=color,
        width=width,
    )


def _droplets_for(frame_index: int, slime_shift: int) -> list[tuple[int, int, int, int]]:
    if frame_index == 0:
        return [(9, 17 + slime_shift, 14, 22 + slime_shift),
                (48, 12 + slime_shift, 54, 18 + slime_shift)]
    if frame_index == 1:
        return [(6, 15 + slime_shift, 14, 23 + slime_shift),
                (46, 10 + slime_shift, 56, 20 + slime_shift),
                (52, 20 + slime_shift, 58, 26 + slime_shift)]
    return [(4, 14 + slime_shift, 15, 25 + slime_shift),
            (44, 9 + slime_shift, 58, 23 + slime_shift),
            (54, 26 + slime_shift, 60, 32 + slime_shift)]
