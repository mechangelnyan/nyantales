#!/usr/bin/env python3
"""Generate a single character portrait using Z-Image-Turbo + anime LoRA."""
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

prompt = sys.argv[1]
output = sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42
lora_scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0

print(f"Prompt: {prompt[:100]}...")
print(f"Output: {output}")
print(f"Seed: {seed}, LoRA scale: {lora_scale}")

start = time.time()
model = ZImageTurbo(
    quantize=8,
    lora_paths=[LORA_PATH],
    lora_scales=[lora_scale],
)
print(f"Model loaded in {time.time()-start:.0f}s")

start = time.time()
image = model.generate_image(
    prompt=prompt,
    seed=seed,
    num_inference_steps=9,
    width=768,
    height=1024,
)
image.save(output)
print(f"Generated in {time.time()-start:.0f}s — saved to {output}")
