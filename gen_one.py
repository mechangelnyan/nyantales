#!/usr/bin/env python3
"""Generate ONE thumbnail at a time."""
import sys, os, subprocess, time

_orig = subprocess.run
def _patched(*a, **kw):
    cmd = a[0] if a else kw.get('args', [])
    if isinstance(cmd, list) and 'system_profiler' in cmd:
        import types; r = types.SimpleNamespace(); r.stdout = '{"SPHardwareDataType": [{}]}'; r.returncode = 0; return r
    return _orig(*a, **kw)
subprocess.run = _patched

from mflux.models.z_image import ZImageTurbo

LORA = "/tmp/nyantales/loras/elusarca-anime-style.safetensors"
prompt = sys.argv[1]
output = sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0

print(f"Generating seed {seed} -> {output}")
t = time.time()
model = ZImageTurbo(quantize=8, lora_paths=[LORA], lora_scales=[scale])
print(f"Model loaded ({time.time()-t:.0f}s)")

t = time.time()
img = model.generate_image(prompt=prompt, seed=seed, num_inference_steps=9, width=448, height=448)
img.save(output)
print(f"Done in {time.time()-t:.0f}s -> {output}")
