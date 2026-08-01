from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    api_key: str
    max_csv_bytes: int = 5 * 1024 * 1024
    max_csv_rows: int = 20_000
    max_csv_columns: int = 50
    max_categorical_values: int = 50
    max_encoded_features: int = 500
    max_prediction_rows: int = 10
    min_usable_rows: int = 20
    small_dataset_warning_rows: int = 100
    max_classification_classes: int = 10
    class_imbalance_threshold_percent: float = 20.0
    sample_rows: int = 10

    @classmethod
    def from_environment(cls) -> "Settings":
        api_key = os.environ.get("ML_SERVICE_API_KEY")
        if not api_key:
            raise RuntimeError("ML_SERVICE_API_KEY must be configured.")
        return cls(
            api_key=api_key,
            max_csv_bytes=_positive_int("ML_PROFILE_MAX_CSV_BYTES", 5 * 1024 * 1024),
            max_csv_rows=_positive_int("ML_PROFILE_MAX_CSV_ROWS", 20_000),
            max_csv_columns=_positive_int("ML_PROFILE_MAX_CSV_COLUMNS", 50),
            max_categorical_values=_positive_int("ML_PROFILE_MAX_CATEGORICAL_VALUES", 50),
            max_encoded_features=_positive_int("ML_MAX_ENCODED_FEATURES", 500),
            max_prediction_rows=_bounded_int("ML_MAX_PREDICTION_ROWS", 10, minimum=1, maximum=10),
            min_usable_rows=_positive_int("ML_MIN_USABLE_ROWS", 20),
            small_dataset_warning_rows=_positive_int("ML_SMALL_DATASET_WARNING_ROWS", 100),
            max_classification_classes=_bounded_int("ML_MAX_CLASSIFICATION_CLASSES", 10, minimum=2, maximum=10),
            class_imbalance_threshold_percent=_percentage("ML_CLASS_IMBALANCE_THRESHOLD_PERCENT", 20.0),
            sample_rows=_positive_int("ML_PROFILE_SAMPLE_ROWS", 10),
        )


def _positive_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer.") from error

    if value <= 0:
        raise RuntimeError(f"{name} must be a positive integer.")
    return value


def _bounded_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    value = _positive_int(name, default)
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} must be between {minimum} and {maximum}.")
    return value


def _percentage(name: str, default: float) -> float:
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    try:
        value = float(raw_value)
    except ValueError as error:
        raise RuntimeError(f"{name} must be between 0 and 100.") from error
    if not 0 <= value <= 100:
        raise RuntimeError(f"{name} must be between 0 and 100.")
    return value
