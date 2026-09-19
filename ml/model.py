"""ImageNet-pretrained EfficientNet-B0 encoder. Not a diagnostic model."""

from __future__ import annotations

import torch
import torch.nn as nn
from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0


class PhotoTriageEncoder(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1
        backbone = efficientnet_b0(weights=weights)
        self.features = backbone.features
        self.pool = backbone.avgpool
        self.embed_dim = 1280

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [N, 3, 224, 224] -> [N, 1280]
        feats = self.features(x)
        pooled = self.pool(feats)
        return torch.flatten(pooled, 1)


class MalignancyHead(nn.Module):
    """Trained only when pathology-confirmed labels exist. Disabled in v1 app."""

    def __init__(self, embed_dim: int = 1280) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embed_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
        )

    def forward(self, pooled_views: torch.Tensor) -> torch.Tensor:
        return self.net(pooled_views).squeeze(-1)


def aggregate_views(embeds: torch.Tensor) -> torch.Tensor:
    # embeds: [4, 1280] — mean is permutation-invariant
    return embeds.mean(dim=0, keepdim=True)
