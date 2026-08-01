"""
Image loading and preprocessing for the chest X-ray classification/
detection pipeline. Handles PNG/JPEG via Pillow, and DICOM via pydicom
if it's installed (soft dependency -- most public chest X-ray datasets
like RSNA ship as DICOM, but this module still works for PNG/JPEG-only
workflows if pydicom isn't present).

All functions return either numpy arrays (intermediate steps) or a
final torch.Tensor shaped [C, H, W], ready for a CNN backbone.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Union

import cv2
import numpy as np
import torch
from PIL import Image

logger = logging.getLogger("medagent.vision.preprocessing")

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut

    _PYDICOM_AVAILABLE = True
except ImportError:
    pydicom = None  # type: ignore[assignment]
    apply_voi_lut = None  # type: ignore[assignment]
    _PYDICOM_AVAILABLE = False
    logger.info("pydicom not installed -- DICOM loading is disabled; PNG/JPEG still work.")


ImageInput = Union[str, Path, np.ndarray, Image.Image]

_DICOM_EXTENSIONS = {".dcm", ".dicom", ".ima"}
_RASTER_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def load_image(source: ImageInput) -> np.ndarray:
    """
    Loads a chest X-ray from disk (or accepts an already-loaded array or
    PIL image) and returns a numpy float32 array in its native intensity
    range -- NOT yet grayscale-collapsed or normalized; that's
    to_grayscale() / normalize_intensity()'s job, kept separate so each
    step is independently testable and reusable.

    Dispatches on file extension:
      - .dcm / .dicom / .ima -> pydicom, with VOI LUT windowing and
        MONOCHROME1 inversion applied (see _load_dicom).
      - .png / .jpg / .jpeg / .bmp / .tif / .tiff -> Pillow.
      - np.ndarray -> returned as float32, unchanged otherwise.
      - PIL.Image.Image -> converted to a numpy array (mode preserved).

    Raises:
        FileNotFoundError: path does not exist.
        ValueError: unsupported extension, or a DICOM file was given
            but pydicom is not installed.
    """
    if isinstance(source, np.ndarray):
        return source.astype(np.float32)

    if isinstance(source, Image.Image):
        return np.array(source, dtype=np.float32)

    path = Path(source)
    if not path.is_file():
        raise FileNotFoundError(f"Image file not found: {path}")

    suffix = path.suffix.lower()

    if suffix in _DICOM_EXTENSIONS:
        return _load_dicom(path)

    if suffix in _RASTER_EXTENSIONS:
        return _load_raster(path)

    raise ValueError(
        f"Unsupported image extension '{suffix}' for {path}. "
        f"Supported: {sorted(_DICOM_EXTENSIONS | _RASTER_EXTENSIONS)}"
    )


def _load_raster(path: Path) -> np.ndarray:
    """Loads a PNG/JPEG/etc. via Pillow. Mode (grayscale or RGB) is preserved."""
    with Image.open(path) as img:
        return np.array(img, dtype=np.float32)


def read_dicom_dataset(path: Path) -> "pydicom.Dataset":
    """
    Reads a DICOM file into a pydicom Dataset without extracting pixels
    -- split out from _load_dicom() so privacy/dicom_scrubbing.py can
    scrub a dataset's metadata tags independently of pixel extraction,
    without duplicating the VOI-LUT/MONOCHROME1 logic below.
    """
    if not _PYDICOM_AVAILABLE:
        raise ValueError(
            f"Cannot load DICOM file {path}: pydicom is not installed. "
            f"Install it with `pip install pydicom` to enable DICOM support."
        )
    return pydicom.dcmread(str(path))


def extract_dicom_pixels(dcm: "pydicom.Dataset") -> np.ndarray:
    """
    Applies VOI LUT windowing (uses the file's own WindowCenter/WindowWidth
    when present, otherwise falls back to a linear rescale) and inverts
    MONOCHROME1 images so higher pixel values consistently mean denser
    tissue across the whole pipeline regardless of source photometric
    interpretation. Takes an already-read Dataset (see
    read_dicom_dataset()) rather than a path, so metadata scrubbing can
    happen on the same in-memory dataset before pixels are touched.
    """
    array = apply_voi_lut(dcm.pixel_array, dcm).astype(np.float32)

    if getattr(dcm, "PhotometricInterpretation", "") == "MONOCHROME1":
        array = array.max() - array

    return array


def _load_dicom(path: Path) -> np.ndarray:
    """Loads a DICOM file via pydicom and returns its windowed pixel array.
    See read_dicom_dataset() / extract_dicom_pixels() for the two steps
    this composes."""
    dcm = read_dicom_dataset(path)
    return extract_dicom_pixels(dcm)


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Collapses a 3-channel array to single-channel grayscale; a 2D array
    is returned unchanged. Guards against the common footgun of casting
    an already-[0,1]-normalized float array straight to uint8 (which
    would crush nearly all pixel values to 0), by routing through a
    float-safe conversion when the input already looks normalized.
    """
    if image.ndim == 2:
        return image.astype(np.float32)

    if image.ndim != 3:
        raise ValueError(f"Expected a 2D or 3D array, got shape {image.shape}")

    if np.issubdtype(image.dtype, np.floating) and image.max() <= 1.0:
        logger.warning(
            "Received a 3-channel array that already looks normalized to [0,1] -- "
            "converting to grayscale via a float-safe path instead of casting to "
            "uint8 directly, which would have crushed the data toward zero."
        )
        gray = cv2.cvtColor(image.astype(np.float32), cv2.COLOR_RGB2GRAY)
    else:
        gray = cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)

    return gray


def normalize_intensity(image: np.ndarray) -> np.ndarray:
    """
    Min-max normalizes a single-channel image to [0, 1] float32. Falls
    back to an all-zero image (rather than dividing by zero) for a
    flat/blank input, which occasionally happens with corrupted or
    all-black source scans.
    """
    image = image.astype(np.float32)
    minimum, maximum = float(image.min()), float(image.max())
    span = maximum - minimum

    if span < 1e-6:
        logger.warning(
            "Image has near-zero dynamic range (min=%.3f, max=%.3f) -- returning zeros",
            minimum, maximum,
        )
        return np.zeros_like(image, dtype=np.float32)

    return (image - minimum) / span


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """
    Applies Contrast Limited Adaptive Histogram Equalization to bring
    out lung opacities and bone structure detail that global contrast
    stretching alone tends to wash out. CLAHE itself is an 8-bit OpenCV
    operation, so a [0, 1] float image is scaled up and back down
    around the call; a uint8 image passes through unchanged in dtype.

    Args:
        image: single-channel image, either [0, 1] float or [0, 255] uint8.
        clip_limit: contrast-limiting threshold -- higher values allow
            stronger local contrast enhancement at the cost of more
            noise amplification. 2.0-3.0 is a reasonable range for
            chest radiographs.
        tile_grid_size: grid size CLAHE computes local histograms over.
            Smaller tiles give finer local adjustment; too small can
            amplify noise, especially in low-signal lung fields.
    """
    was_float = np.issubdtype(image.dtype, np.floating)
    image_uint8 = (np.clip(image, 0.0, 1.0) * 255).astype(np.uint8) if was_float else image.astype(np.uint8)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    equalized = clahe.apply(image_uint8)

    return (equalized.astype(np.float32) / 255.0) if was_float else equalized


def preprocess_radiograph(
    image: ImageInput,
    target_size: tuple[int, int] = (224, 224),
    clahe_clip_limit: float = 2.0,
    to_rgb: bool = True,
) -> torch.Tensor:
    """
    Full preprocessing pipeline for feeding a chest X-ray into a CNN/ViT
    backbone: load -> grayscale -> resize -> [0,1] normalize -> CLAHE ->
    channel replication -> tensor.

    Resize happens before CLAHE deliberately: source images arrive at
    wildly different native resolutions (different scanners/datasets),
    and running CLAHE after resizing means `tile_grid_size` always
    represents the same *relative* granularity regardless of source
    resolution, rather than needing to be re-tuned per image.

    Args:
        image: file path, numpy array, or PIL Image of the source X-ray.
        target_size: (height, width) the CNN backbone expects.
        clahe_clip_limit: forwarded to apply_clahe.
        to_rgb: if True (default), replicates the single grayscale
            channel to 3 channels so the tensor is compatible with
            ImageNet-pretrained backbones (ViT/ResNet/etc.) that expect
            3-channel input. If False, returns a single-channel tensor.

    Returns:
        torch.Tensor of shape [3, H, W] (or [1, H, W] if to_rgb=False),
        dtype float32, values in [0, 1].
    """
    array = load_image(image)
    grayscale = to_grayscale(array)

    height, width = target_size
    resized = cv2.resize(grayscale, (width, height), interpolation=cv2.INTER_AREA)

    normalized = normalize_intensity(resized)
    enhanced = apply_clahe(normalized, clip_limit=clahe_clip_limit)

    if to_rgb:
        channels = np.stack([enhanced, enhanced, enhanced], axis=0)  # [3, H, W]
    else:
        channels = enhanced[np.newaxis, :, :]  # [1, H, W]

    return torch.from_numpy(np.ascontiguousarray(channels)).float()