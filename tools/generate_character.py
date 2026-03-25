#!/usr/bin/env python3
"""Generate a character portrait using mflux Z-Image-Turbo."""
import sys
import os

# Monkey-patch to skip system_profiler call
import subprocess
_original_run = subprocess.run
def _patched_run(*args, **kwargs):
    cmd = args[0] if args else kwargs.get('args', [])
    if isinstance(cmd, list) and 'system_profiler' in cmd:
        # Return fake hardware data
        import types
        result = types.SimpleNamespace()
        result.stdout = '{"SPHardwareDataType": [{"chip_type": "Apple M2", "physical_memory": "16 GB"}]}'
        result.returncode = 0
        return result
    return _original_run(*args, **kwargs)
subprocess.run = _patched_run

from mflux.models.z_image import ZImageTurbo

prompt = sys.argv[1] if len(sys.argv) > 1 else "anime catgirl portrait"
output = sys.argv[2] if len(sys.argv) > 2 else "output.png"
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42

print(f"Generating: {prompt[:80]}...")
print(f"Output: {output}")
print(f"Seed: {seed}")

model = ZImageTurbo(quantize=8)
image = model.generate_image(
    prompt=prompt,
    seed=seed,
    num_inference_steps=9,
    width=768,
    height=1024,
)
image.save(output)
print(f"Done! Saved to {output}")
