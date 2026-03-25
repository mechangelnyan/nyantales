#!/usr/bin/env python3
"""Generate thumbnail character portraits for quick review."""
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

LORA_PATH = "/tmp/nyantales/loras/elusarca-anime-style.safetensors"
OUTPUT_DIR = "/tmp/nyantales/web/assets/characters/thumbs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

prompt = sys.argv[1]
name = sys.argv[2]  # character name
seeds = [int(s) for s in sys.argv[3].split(",")] if len(sys.argv) > 3 else [42]
lora_scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
width = int(sys.argv[5]) if len(sys.argv) > 5 else 448
height = int(sys.argv[6]) if len(sys.argv) > 6 else 448

print(f"Character: {name}")
print(f"Seeds: {seeds}")
print(f"Size: {width}x{height}")
print(f"LoRA scale: {lora_scale}")
print()

start = time.time()
model = ZImageTurbo(
    quantize=8,
    lora_paths=[LORA_PATH],
    lora_scales=[lora_scale],
)
print(f"Model loaded in {time.time()-start:.0f}s\n")

for seed in seeds:
    output_path = os.path.join(OUTPUT_DIR, f"{name}_s{seed}.png")
    print(f"  Seed {seed}...", end=" ", flush=True)
    start = time.time()
    image = model.generate_image(
        prompt=prompt,
        seed=seed,
        num_inference_steps=9,
        width=width,
        height=height,
    )
    image.save(output_path)
    print(f"done in {time.time()-start:.0f}s")

print(f"\nAll done! Check {OUTPUT_DIR}/{name}_s*.png")
