#!/usr/bin/env python3
"""Batch generate anime character portraits for NyanTales using Z-Image-Turbo."""
import sys
import os
import subprocess
import time

# Monkey-patch to skip system_profiler call
_original_run = subprocess.run
def _patched_run(*args, **kwargs):
    cmd = args[0] if args else kwargs.get('args', [])
    if isinstance(cmd, list) and 'system_profiler' in cmd:
        import types
        result = types.SimpleNamespace()
        result.stdout = '{"SPHardwareDataType": [{"chip_type": "Apple M2", "physical_memory": "16 GB"}]}'
        result.returncode = 0
        return result
    return _original_run(*args, **kwargs)
subprocess.run = _patched_run

from mflux.models.z_image import ZImageTurbo

OUTPUT_DIR = "/tmp/nyantales/web/assets/characters"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Character definitions — anime catgirl/catboy style for visual novel
CHARACTERS = [
    {
        "name": "pixel",
        "seed": 101,
        "prompt": "anime style portrait of a catgirl with calico colored hair in orange black and white streaks, bright green eyes, cat ears with orange and black patches, brave determined expression, wearing a tech vest with glowing network node patches, dark teal background with floating data packets and network lines, visual novel character sprite, high quality anime art, detailed, cyberpunk aesthetic"
    },
    {
        "name": "byte",
        "seed": 202,
        "prompt": "anime style portrait of a catboy with short messy gray hair, calm amber eyes, small gray cat ears, composed unflappable expression, wearing a dark hoodie with memory address hex codes printed on it, dark background with faint blue binary streams, visual novel character sprite, high quality anime art, detailed, hacker aesthetic"
    },
    {
        "name": "mochi",
        "seed": 303,
        "prompt": "anime style portrait of a catgirl with calico colored hair in warm orange and dark patches, friendly warm brown eyes, calico cat ears, cheerful welcoming smile, wearing a cute barista apron over a cozy sweater, warm golden cafe background with coffee steam and pastries, visual novel character sprite, high quality anime art, detailed, cozy aesthetic"
    },
    {
        "name": "inspector_whiskers",
        "seed": 404,
        "prompt": "anime style portrait of a distinguished catboy with sleek dark gray hair and prominent whiskers, sharp intelligent golden eyes, pointed gray cat ears, shrewd analytical expression, wearing a noir detective trenchcoat and fedora hat, dark moody background with git branch diagrams and code diffs, visual novel character sprite, high quality anime art, detailed, noir detective aesthetic"
    },
    {
        "name": "query",
        "seed": 505,
        "prompt": "anime style portrait of a catgirl with tabby striped brown hair, hopeful teal eyes, tabby cat ears with glowing cyan tips like antennas, determined hopeful expression, wearing a light outfit with DNS record labels and packet header decorations, blue-teal background with floating domain names and glowing network nodes, visual novel character sprite, high quality anime art, detailed, ethereal digital aesthetic"
    },
    {
        "name": "mantissa",
        "seed": 606,
        "prompt": "anime style portrait of a catgirl made of shimmering translucent light, hair that fades from white to glitchy pixelated edges, one eye slightly different shade than the other suggesting imprecision, ethereal dreamy expression, wearing a dress covered in floating decimal numbers and IEEE 754 notation, background of infinite number line stretching to horizon with epsilon gaps, visual novel character sprite, high quality anime art, detailed, mathematical ethereal aesthetic"
    },
    {
        "name": "recurse",
        "seed": 707,
        "prompt": "anime style portrait of a catboy with wild spiky orange hair, energetic bright green eyes, fluffy orange cat ears, determined but slightly confused expression, wearing a jacket with nested brackets pattern {{ }} and stack frame diagrams, background showing infinite recursive mirrors getting smaller, visual novel character sprite, high quality anime art, detailed, energetic recursive aesthetic"
    },
    {
        "name": "glyph",
        "seed": 808,
        "prompt": "anime style portrait of a catgirl with iridescent rainbow-shifting hair that glitches between styles, bright multicolored eyes, cat ears with unicode symbols floating around them, resilient proud expression, wearing a shirt covered in UTF-8 byte sequences and international scripts, background with garbled mojibake text transforming into clean unicode, visual novel character sprite, high quality anime art, detailed, encoding aesthetic"
    },
    {
        "name": "mutex",
        "seed": 909,
        "prompt": "anime style portrait of a catboy with split black and white hair down the middle, serious contemplative heterochromatic eyes one gold one blue, black and white cat ears, mediator expression of deep thought, wearing a referee-style outfit with lock and key symbols, background showing two threads as colored energy streams converging, visual novel character sprite, high quality anime art, detailed, concurrency aesthetic"
    },
    {
        "name": "sudo",
        "seed": 1010,
        "prompt": "anime style portrait of a scrappy catgirl with messy short hair dyed in patches, defiant determined hazel eyes, slightly torn cat ears, rebellious but resourceful expression, wearing a worn jacket with permission denied error messages as patches, dark filesystem corridor background with locked doors and glowing terminal prompts, visual novel character sprite, high quality anime art, detailed, hacker punk aesthetic"
    },
]

print(f"=== NyanTales Character Batch Generation ===")
print(f"Characters to generate: {len(CHARACTERS)}")
print(f"Output: {OUTPUT_DIR}")
print(f"Estimated time: ~{len(CHARACTERS) * 20} minutes")
print()

# Load model once
print("Loading Z-Image-Turbo model (q8)...")
model = ZImageTurbo(quantize=8)
print("Model loaded!\n")

for i, char in enumerate(CHARACTERS):
    output_path = os.path.join(OUTPUT_DIR, f"{char['name']}_anime.png")
    
    # Skip if already generated
    if os.path.exists(output_path):
        print(f"[{i+1}/{len(CHARACTERS)}] {char['name']} — already exists, skipping")
        continue
    
    print(f"[{i+1}/{len(CHARACTERS)}] Generating {char['name']}...")
    start = time.time()
    
    image = model.generate_image(
        prompt=char["prompt"],
        seed=char["seed"],
        num_inference_steps=9,
        width=768,
        height=1024,
    )
    image.save(output_path)
    
    elapsed = time.time() - start
    print(f"  Done in {elapsed:.0f}s — saved to {output_path}")

print(f"\n=== All done! ===")
