"""Export ImageNet EfficientNet-B0 feature encoder to models/photo-triage-v1.onnx."""

from __future__ import annotations

from pathlib import Path

import torch

from model import PhotoTriageEncoder

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "models" / "photo-triage-v1.onnx"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    model = PhotoTriageEncoder().eval()
    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy,
        OUT,
        input_names=["image"],
        output_names=["embedding"],
        dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=17,
    )
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
