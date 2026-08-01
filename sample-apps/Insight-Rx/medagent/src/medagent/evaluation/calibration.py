"""
Post-hoc probability calibration -- Phase 1, item 3
(Strategic_Startup_Roadmap.pdf: "Run and record calibration ... apply
temperature/Platt scaling").

TemperatureScaler implements temperature scaling (Guo et al. 2017, "On
Calibration of Modern Neural Networks"): fits a single scalar T that
minimizes negative log-likelihood on held-out logits/labels via L-BFGS
-- the paper's own choice of optimizer, and the right one here: this is
a 1-parameter, near-convex problem L-BFGS converges on in a handful of
steps, unlike SGD, which would need a learning-rate schedule for
something this simple.

Dividing logits by T before softmax/sigmoid reshapes confidence without
touching the *ranking* of predictions -- argmax (and therefore accuracy)
is provably unchanged by any T > 0, only how confident the model claims
to be. That's the whole point: this corrects calibration, not accuracy,
and evaluation/metrics.py's calculate_ece() is what measures the
miscalibration this class exists to fix.

This is the ONE place a temperature value is fit, stored, and applied
in this codebase. It intentionally does not live inside
vision/models/classifier.py's PneumoNetCXR (an earlier version of that
class carried its own temperature parameter, which risked applying
temperature scaling twice -- once inside the model, once again here --
if both were ever used together). vision/inference.py loads a
TemperatureScaler and applies it explicitly to the classifier's raw
logits; see its module docstring.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import torch
from torch import nn

logger = logging.getLogger("medagent.evaluation.calibration")

DEFAULT_TEMPERATURE_PATH = "models/temperature.json"


class TemperatureScaler(nn.Module):
    """A single learnable temperature T, stored internally as log(T) so
    T = exp(log_T) stays positive regardless of what gradient steps do
    to it."""

    def __init__(self, initial_temperature: float = 1.0) -> None:
        super().__init__()
        if initial_temperature <= 0:
            raise ValueError(f"initial_temperature must be > 0, got {initial_temperature}")
        self.log_temperature = nn.Parameter(torch.tensor(float(initial_temperature)).log())

    @property
    def temperature(self) -> float:
        return float(self.log_temperature.exp().item())

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """Returns temperature-scaled LOGITS (not probabilities) -- the
        caller applies softmax/sigmoid afterward, same convention
        classifier.py's raw backbone output already uses."""
        return logits / self.log_temperature.exp()

    def fit(
        self,
        logits: torch.Tensor,
        labels: torch.Tensor,
        max_iter: int = 50,
        lr: float = 0.01,
    ) -> float:
        """
        Fits T by minimizing NLL via L-BFGS and returns the fitted value.

        `logits`: [N] or [N, 1] for a single-logit binary target (binary
        cross-entropy is used), or [N, C] for a C-class softmax target
        (cross-entropy is used) -- detected automatically from shape.
        `labels`: binary 0/1 (matching a binary logits shape) or integer
        class indices (matching a multi-class logits shape).

        Fits in-place (this instance's log_temperature is updated) and
        also returns the value for convenience.
        """
        logits = logits.detach()
        labels = labels.detach()
        is_binary = logits.ndim == 1 or logits.shape[-1] == 1

        if is_binary:
            logits = logits.view(-1)
            labels = labels.view(-1).float()
            loss_fn: nn.Module = nn.BCEWithLogitsLoss()
        else:
            labels = labels.view(-1).long()
            loss_fn = nn.CrossEntropyLoss()

        optimizer = torch.optim.LBFGS([self.log_temperature], lr=lr, max_iter=max_iter)

        def closure() -> torch.Tensor:
            optimizer.zero_grad()
            loss = loss_fn(self(logits), labels)
            loss.backward()
            return loss

        optimizer.step(closure)

        logger.info(
            "Fitted temperature T=%.4f via L-BFGS NLL minimization on %d example(s).",
            self.temperature, len(labels),
        )
        return self.temperature

    def save(self, path: str | Path = DEFAULT_TEMPERATURE_PATH) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"temperature": self.temperature}, indent=2))
        logger.info("Saved fitted temperature T=%.4f to %s", self.temperature, path)

    @classmethod
    def load(cls, path: str | Path = DEFAULT_TEMPERATURE_PATH) -> "TemperatureScaler":
        """
        Loads a previously fitted temperature from disk. If the file
        doesn't exist (e.g. a fresh environment, before Phase 1 has fit
        one against real validation data), returns a no-op T=1.0 scaler
        and logs a warning rather than raising -- inference must still
        run, just uncalibrated, exactly like every other "missing
        artifact" fallback in this codebase (see vision/models/*.py's
        checkpoint-loading functions).
        """
        path = Path(path)
        if not path.is_file():
            logger.warning(
                "No fitted temperature found at %s -- using T=1.0 (no calibration applied). "
                "Fit one via TemperatureScaler.fit() + save() once held-out validation "
                "logits/labels are available.",
                path,
            )
            return cls(initial_temperature=1.0)

        data = json.loads(path.read_text())
        scaler = cls(initial_temperature=data["temperature"])
        logger.info("Loaded fitted temperature T=%.4f from %s", scaler.temperature, path)
        return scaler


if __name__ == "__main__":
    import numpy as np

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    from medagent.evaluation.metrics import calculate_ece

    # Deliberately overconfident logits: real class separation is noisy
    # (true accuracy ends up ~75%), but the logits are scaled up hard
    # regardless, so predicted confidence clusters near 0%/100% far more
    # often than the model is actually right -- textbook miscalibration,
    # not just "correct but a bit too sharp".
    rng = np.random.default_rng(0)
    n = 500
    labels = rng.integers(0, 2, size=n)
    base_logit = np.where(labels == 1, 1.0, -1.0) + rng.normal(0, 1.3, size=n)
    overconfident_logits = torch.tensor(base_logit * 6.0, dtype=torch.float32)  # scale up -> overconfident
    labels_t = torch.tensor(labels, dtype=torch.float32)

    before_probs = torch.sigmoid(overconfident_logits).numpy()
    ece_before = calculate_ece(labels, before_probs)
    print(f"ECE before calibration: {ece_before:.4f}")

    scaler = TemperatureScaler()
    scaler.fit(overconfident_logits, labels_t)

    after_probs = torch.sigmoid(scaler(overconfident_logits)).detach().numpy()
    ece_after = calculate_ece(labels, after_probs)
    print(f"Fitted temperature: {scaler.temperature:.4f}")
    print(f"ECE after calibration: {ece_after:.4f}")

    accuracy_before = float(((before_probs >= 0.5).astype(int) == labels).mean())
    accuracy_after = float(((after_probs >= 0.5).astype(int) == labels).mean())
    print(f"Accuracy before: {accuracy_before:.4f}, after: {accuracy_after:.4f} (must be identical)")
