"""Generate real-sized PWA and iOS home-screen icons from existing MORROW artwork."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)
BACKGROUND = (242, 240, 234, 255)
RESAMPLE = Image.Resampling.LANCZOS


def flatten(image: Image.Image, size: int) -> Image.Image:
    source = image.convert("RGBA").resize((size, size), RESAMPLE)
    background = Image.new("RGBA", (size, size), BACKGROUND)
    background.alpha_composite(source)
    return background.convert("RGB")


with Image.open(ROOT / "assets" / "icon.png") as source:
    for pixels, filename in [
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (180, "apple-touch-icon.png"),
    ]:
        flatten(source, pixels).save(DIST / filename, optimize=True)

# Use the existing Android adaptive foreground; it already has safe-area padding.
with Image.open(ROOT / "assets" / "android-icon-foreground.png") as foreground:
    flatten(foreground, 512).save(DIST / "icon-maskable-512.png", optimize=True)

print("Created PWA icons: 192px, 512px, maskable 512px, Apple 180px.")
