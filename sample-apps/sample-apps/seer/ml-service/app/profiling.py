import csv
import io
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
import pandas as pd
from pandas.errors import EmptyDataError, ParserError
from pydantic import BaseModel, Field

from .config import Settings

ColumnType = Literal["boolean", "numeric", "categorical", "datetime", "text", "empty"]


class NumericSummary(BaseModel):
    min: float
    max: float
    mean: float
    median: float
    standardDeviation: float
    q1: float
    q3: float


class CategoryFrequency(BaseModel):
    value: str
    count: int
    percentage: float


class HistogramBin(BaseModel):
    start: float
    end: float
    count: int


class ColumnProfile(BaseModel):
    name: str
    type: ColumnType
    missingCount: int
    missingPercent: float
    uniqueCount: int
    numericSummary: NumericSummary | None = None
    categories: list[CategoryFrequency] = Field(default_factory=list)


class UnsupportedColumn(BaseModel):
    name: str
    reason: str


class MissingValueBar(BaseModel):
    column: str
    count: int


class NumericDistribution(BaseModel):
    column: str
    bins: list[HistogramBin]


class CategoryDistribution(BaseModel):
    column: str
    values: list[CategoryFrequency]


class ProfileCharts(BaseModel):
    missingValues: list[MissingValueBar]
    numericDistributions: list[NumericDistribution]
    categoryFrequencies: list[CategoryDistribution]


class ProfileResponse(BaseModel):
    datasetId: str
    dimensions: dict[str, int]
    columns: list[ColumnProfile]
    duplicateRowCount: int
    targetCandidates: list[str]
    identifierCandidates: list[str]
    constantColumns: list[str]
    unsupportedColumns: list[UnsupportedColumn]
    sampleRows: list[dict[str, str | int | float | bool | None]]
    warnings: list[str]
    charts: ProfileCharts


@dataclass(frozen=True)
class ProfileFailure(Exception):
    status_code: int
    detail: str


def profile_csv(dataset_id: str, raw_csv: bytes, settings: Settings) -> ProfileResponse:
    if len(raw_csv) > settings.max_csv_bytes:
        raise ProfileFailure(413, "CSV exceeds the configured file-size limit.")

    _validate_header(raw_csv)
    dataframe = _read_csv(raw_csv)

    if dataframe.empty:
        raise ProfileFailure(422, "CSV must contain at least one data row.")
    if len(dataframe.columns) > settings.max_csv_columns:
        raise ProfileFailure(422, "CSV exceeds the configured column limit.")
    if len(dataframe.index) > settings.max_csv_rows:
        raise ProfileFailure(422, "CSV exceeds the configured row limit.")

    columns: list[ColumnProfile] = []
    numeric_distributions: list[NumericDistribution] = []
    category_distributions: list[CategoryDistribution] = []
    identifier_candidates: list[str] = []
    target_candidates: list[str] = []
    constant_columns: list[str] = []
    unsupported_columns: list[UnsupportedColumn] = []
    warnings: list[str] = []

    for name in dataframe.columns:
        series = dataframe[name]
        non_null = series.dropna()
        missing_count = int(series.isna().sum())
        unique_count = int(non_null.nunique())
        column_type = _infer_column_type(series, settings.max_categorical_values)
        is_identifier = _is_identifier(str(name), column_type, len(non_null), unique_count, len(dataframe.index))
        numeric_summary = _numeric_summary(series) if column_type == "numeric" else None
        categories = _category_frequencies(series) if column_type in {"boolean", "categorical"} else []

        columns.append(ColumnProfile(
            name=str(name),
            type=column_type,
            missingCount=missing_count,
            missingPercent=_percentage(missing_count, len(dataframe.index)),
            uniqueCount=unique_count,
            numericSummary=numeric_summary,
            categories=categories,
        ))

        if non_null.empty:
            unsupported_columns.append(UnsupportedColumn(name=str(name), reason="Column contains no non-missing values."))
        elif unique_count <= 1:
            constant_columns.append(str(name))
        elif is_identifier:
            identifier_candidates.append(str(name))
        elif column_type == "numeric" or (
            column_type in {"boolean", "categorical"} and 2 <= unique_count <= 10
        ):
            target_candidates.append(str(name))

        if column_type == "datetime":
            unsupported_columns.append(UnsupportedColumn(name=str(name), reason="Datetime columns are not supported in the MVP."))
        elif column_type == "text" and not is_identifier:
            unsupported_columns.append(UnsupportedColumn(
                name=str(name),
                reason=f"Column has more than {settings.max_categorical_values} distinct values and is treated as free text.",
            ))

        if column_type == "numeric":
            numeric_distributions.append(NumericDistribution(column=str(name), bins=_histogram(series)))
        elif column_type in {"boolean", "categorical"}:
            category_distributions.append(CategoryDistribution(column=str(name), values=categories))

    duplicate_count = int(dataframe.duplicated().sum())
    if any(column.missingCount for column in columns):
        warnings.append("Some feature values are missing; a later analysis plan must disclose how they are handled.")
    if duplicate_count:
        warnings.append(f"Dataset contains {duplicate_count} exact duplicate row(s); they have not been removed.")
    if identifier_candidates:
        warnings.append("Identifier-like columns should normally be excluded from model features.")
    if unsupported_columns:
        warnings.append("Some columns are unsupported for the MVP and should not be selected as model features.")

    return ProfileResponse(
        datasetId=dataset_id,
        dimensions={"rows": len(dataframe.index), "columns": len(dataframe.columns)},
        columns=columns,
        duplicateRowCount=duplicate_count,
        targetCandidates=target_candidates,
        identifierCandidates=identifier_candidates,
        constantColumns=constant_columns,
        unsupportedColumns=unsupported_columns,
        sampleRows=_sample_rows(dataframe, settings.sample_rows),
        warnings=warnings,
        charts=ProfileCharts(
            missingValues=[MissingValueBar(column=column.name, count=column.missingCount) for column in columns],
            numericDistributions=numeric_distributions,
            categoryFrequencies=category_distributions,
        ),
    )


def _validate_header(raw_csv: bytes) -> None:
    try:
        text = raw_csv.decode("utf-8-sig")
        header = next(csv.reader(io.StringIO(text)), None)
    except (UnicodeDecodeError, csv.Error) as error:
        raise ProfileFailure(422, "CSV could not be parsed.") from error

    if not header or not any(value.strip() for value in header):
        raise ProfileFailure(422, "CSV must contain a header row.")
    if any(not value.strip() for value in header):
        raise ProfileFailure(422, "CSV column names must not be empty.")
    if len(header) != len(set(header)):
        raise ProfileFailure(422, "CSV column names must be unique.")


def _read_csv(raw_csv: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(raw_csv))
    except (EmptyDataError, ParserError, UnicodeDecodeError) as error:
        raise ProfileFailure(422, "CSV could not be parsed.") from error


def _infer_column_type(series: pd.Series, max_categorical_values: int) -> ColumnType:
    non_null = series.dropna()
    if non_null.empty:
        return "empty"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"

    normalized = non_null.astype(str).str.strip().str.lower()
    if normalized.isin({"true", "false", "yes", "no"}).all():
        return "boolean"

    numeric_values = pd.to_numeric(non_null, errors="coerce")
    if numeric_values.notna().all():
        return "numeric"

    looks_like_date = normalized.str.contains(r"\d{1,4}[-/]\d{1,2}", regex=True)
    if looks_like_date.all():
        datetime_values = pd.to_datetime(non_null, errors="coerce", utc=False)
        if datetime_values.notna().all():
            return "datetime"

    if int(non_null.nunique()) <= max_categorical_values:
        return "categorical"
    return "text"


def _numeric_summary(series: pd.Series) -> NumericSummary:
    numeric = pd.to_numeric(series, errors="coerce").dropna().astype(float)
    return NumericSummary(
        min=float(numeric.min()),
        max=float(numeric.max()),
        mean=float(numeric.mean()),
        median=float(numeric.median()),
        standardDeviation=float(numeric.std(ddof=0)),
        q1=float(numeric.quantile(0.25)),
        q3=float(numeric.quantile(0.75)),
    )


def _category_frequencies(series: pd.Series) -> list[CategoryFrequency]:
    non_null = series.dropna().astype(str)
    total = len(non_null)
    if not total:
        return []
    counts = non_null.value_counts().head(10)
    return [
        CategoryFrequency(value=str(value), count=int(count), percentage=_percentage(int(count), total))
        for value, count in counts.items()
    ]


def _histogram(series: pd.Series) -> list[HistogramBin]:
    numeric = pd.to_numeric(series, errors="coerce").dropna().astype(float)
    if numeric.empty:
        return []
    counts, edges = np.histogram(numeric, bins=min(10, max(1, int(numeric.nunique()))))
    return [
        HistogramBin(start=float(edges[index]), end=float(edges[index + 1]), count=int(count))
        for index, count in enumerate(counts)
    ]


def _is_identifier(
    name: str,
    column_type: ColumnType,
    non_null_count: int,
    unique_count: int,
    total_count: int,
) -> bool:
    uniqueness_ratio = unique_count / total_count
    has_identifier_name = name.lower().endswith("id") or "identifier" in name.lower()
    return (has_identifier_name and uniqueness_ratio >= 0.7) or (
        column_type != "numeric"
        and non_null_count / total_count >= 0.95
        and uniqueness_ratio >= 0.95
    )


def _sample_rows(dataframe: pd.DataFrame, limit: int) -> list[dict[str, str | int | float | bool | None]]:
    return [
        {str(name): _json_value(value) for name, value in row.items()}
        for row in dataframe.head(limit).to_dict(orient="records")
    ]


def _json_value(value: Any) -> str | int | float | bool | None:
    if pd.isna(value):
        return None
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    return value


def _percentage(value: int, total: int) -> float:
    return round(value / total * 100, 2) if total else 0.0
