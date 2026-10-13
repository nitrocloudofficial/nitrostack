from __future__ import annotations

import io
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Annotated, Any, Literal, cast
from uuid import uuid4

import numpy as np
import pandas as pd
from numpy.typing import NDArray
from pandas.errors import EmptyDataError, ParserError
from pydantic import BaseModel, ConfigDict, Field
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_fscore_support,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .config import Settings
from .profiling import ProfileFailure, _validate_header

Scalar = str | int | float | bool


class PreprocessingPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    numeric: list[str]
    categorical: list[str]
    numericImputer: Literal["median"]
    numericScaler: Literal["standard"]
    categoricalImputer: Literal["most_frequent"]
    categoricalEncoder: Literal["one_hot"]


class SplitPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trainingPercent: Literal[80]
    testPercent: Literal[20]
    randomState: Literal[42]


class BaseAnalysisPlan(BaseModel):
    """The MCP-side signed plan has already been verified by the caller."""

    model_config = ConfigDict(extra="ignore")

    datasetId: str = Field(min_length=1)
    question: str = Field(min_length=1)
    targetColumn: str = Field(min_length=1)
    featureColumns: list[str] = Field(min_length=1)
    predictionRows: list[dict[str, Scalar]] = Field(min_length=1, max_length=10)
    preprocessing: PreprocessingPlan
    warnings: list[str] = Field(default_factory=list)
    split: SplitPlan


class RegressionAnalysisPlan(BaseAnalysisPlan):
    taskType: Literal["regression"]


class ClassificationAnalysisPlan(BaseAnalysisPlan):
    taskType: Literal["classification"]


type AnalysisPlan = Annotated[
    RegressionAnalysisPlan | ClassificationAnalysisPlan,
    Field(discriminator="taskType"),
]


class RegressionMetricValues(BaseModel):
    mae: float
    rmse: float
    r2: float


class RegressionImprovement(BaseModel):
    maeAbsolute: float
    maePercent: float
    rmseAbsolute: float
    rmsePercent: float
    r2Absolute: float


class RegressionMetrics(BaseModel):
    model: RegressionMetricValues
    baseline: RegressionMetricValues
    improvement: RegressionImprovement


class ClassificationMetricValues(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float


class ClassificationImprovement(BaseModel):
    f1Absolute: float
    f1Percent: float


class ClassificationMetrics(BaseModel):
    model: ClassificationMetricValues
    baseline: ClassificationMetricValues
    improvement: ClassificationImprovement


class PredictionCoverage(BaseModel):
    outsideNumericRanges: list[str]
    unseenCategoricalValues: list[str]


class RegressionPrediction(BaseModel):
    input: dict[str, Scalar]
    estimatedValue: float
    coverage: PredictionCoverage


class ClassificationPrediction(BaseModel):
    input: dict[str, Scalar]
    predictedClass: str
    predictedProbability: float
    coverage: PredictionCoverage


class ActualVsPredictedPoint(BaseModel):
    actual: float
    predicted: float


class ResidualVsPredictedPoint(BaseModel):
    predicted: float
    residual: float


class RegressionCharts(BaseModel):
    actualVsPredicted: list[ActualVsPredictedPoint]
    residualVsPredicted: list[ResidualVsPredictedPoint]


class PerClassMetrics(BaseModel):
    classLabel: str
    precision: float
    recall: float
    f1: float
    support: int


class ConfusionMatrix(BaseModel):
    labels: list[str]
    values: list[list[int]]


class ClassDistribution(BaseModel):
    classLabel: str
    count: int
    percentage: float


class ClassificationCharts(BaseModel):
    confusionMatrix: ConfusionMatrix
    classDistribution: list[ClassDistribution]


class DatasetCoverage(BaseModel):
    trainingRows: int
    testRows: int
    numericRanges: dict[str, dict[str, float]]
    categoricalValues: dict[str, list[str]]


class RegressionAnalysisResponse(BaseModel):
    analysisId: str
    taskType: Literal["regression"]
    model: dict[str, str]
    baseline: dict[str, str]
    quality: Literal["useful_signal", "weak_signal", "no_demonstrated_signal"]
    metrics: RegressionMetrics
    predictions: list[RegressionPrediction]
    charts: RegressionCharts
    datasetCoverage: DatasetCoverage
    warnings: list[str]
    explanationFacts: dict[str, str | int | float | bool]


class ClassificationAnalysisResponse(BaseModel):
    analysisId: str
    taskType: Literal["classification"]
    model: dict[str, str]
    baseline: dict[str, str]
    quality: Literal["useful_signal", "weak_signal", "no_demonstrated_signal"]
    metrics: ClassificationMetrics
    predictions: list[ClassificationPrediction]
    charts: ClassificationCharts
    perClassMetrics: list[PerClassMetrics]
    datasetCoverage: DatasetCoverage
    warnings: list[str]
    explanationFacts: dict[str, str | int | float | bool]


type AnalysisResponse = RegressionAnalysisResponse | ClassificationAnalysisResponse
type TrainTestSplit = tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]
type FloatPredictions = NDArray[np.float64]
type LabelPredictions = NDArray[np.object_]
type PerClassMetricArrays = tuple[
    NDArray[np.float64],
    NDArray[np.float64],
    NDArray[np.float64],
    NDArray[np.int64],
]


@dataclass(frozen=True)
class AnalysisFailure(Exception):
    status_code: int
    detail: str


def analyze_csv(raw_csv: bytes, plan: AnalysisPlan, settings: Settings) -> AnalysisResponse:
    if isinstance(plan, RegressionAnalysisPlan):
        return analyze_regression_csv(raw_csv, plan, settings)
    return analyze_classification_csv(raw_csv, plan, settings)


def analyze_regression_csv(raw_csv: bytes, plan: RegressionAnalysisPlan, settings: Settings) -> RegressionAnalysisResponse:
    dataframe = _read_and_validate_csv(raw_csv, settings)
    _validate_plan_against_dataframe(plan, dataframe, settings, numeric_target=True)

    target = pd.Series(
        pd.to_numeric(_series_column(dataframe, plan.targetColumn), errors="raise"),
        index=dataframe.index,
        dtype="float64",
    )
    usable, usable_target = _usable_rows(dataframe, target)
    if len(usable) < settings.min_usable_rows:
        raise AnalysisFailure(422, f"At least {settings.min_usable_rows} rows with a target value are required for regression.")
    if usable_target.nunique() < 5:
        raise AnalysisFailure(422, "Regression requires a target with at least five distinct values.")

    features = _feature_frame(usable, plan)
    x_train, x_test, y_train, y_test = _train_test_split(features, usable_target)
    model = Pipeline([("preprocessor", _preprocessor(plan.preprocessing)), ("regressor", LinearRegression())])
    baseline = DummyRegressor(strategy="mean")
    model.fit(x_train, y_train)
    baseline.fit(x_train, y_train)

    model_predictions = _float_predictions(model.predict(x_test))
    baseline_predictions = _float_predictions(baseline.predict(x_test))
    model_metrics = _regression_metrics(y_test, model_predictions)
    baseline_metrics = _regression_metrics(y_test, baseline_predictions)
    improvement = _regression_improvement(model_metrics, baseline_metrics)
    quality = _quality(improvement.maePercent)

    prediction_frame = _prediction_frame(plan)
    estimates = _float_predictions(model.predict(prediction_frame))
    coverage = _dataset_coverage(x_train, x_test, plan.preprocessing)
    predictions = [
        RegressionPrediction(input=row, estimatedValue=float(estimate), coverage=_prediction_coverage(row, coverage))
        for row, estimate in zip(plan.predictionRows, estimates, strict=True)
    ]
    warnings = list(dict.fromkeys([
        *plan.warnings,
        *_prediction_warnings(predictions),
        *_regression_quality_warnings(quality, model_metrics),
        *_safety_warnings(len(usable), settings),
        "Predictions are estimates based on historical dataset patterns; they are not guarantees.",
    ]))
    return RegressionAnalysisResponse(
        analysisId=str(uuid4()), taskType="regression", model={"name": "LinearRegression"},
        baseline={"name": "DummyRegressor (mean)"}, quality=quality,
        metrics=RegressionMetrics(model=model_metrics, baseline=baseline_metrics, improvement=improvement),
        predictions=predictions,
        charts=RegressionCharts(
            actualVsPredicted=[ActualVsPredictedPoint(actual=float(actual), predicted=float(predicted)) for actual, predicted in zip(y_test, model_predictions, strict=True)],
            residualVsPredicted=[ResidualVsPredictedPoint(predicted=float(predicted), residual=float(actual - predicted)) for actual, predicted in zip(y_test, model_predictions, strict=True)],
        ),
        datasetCoverage=coverage, warnings=warnings,
        explanationFacts={"targetColumn": plan.targetColumn, "usableRows": len(usable), "droppedMissingTargetRows": int(len(dataframe) - len(usable))},
    )


def analyze_classification_csv(raw_csv: bytes, plan: ClassificationAnalysisPlan, settings: Settings) -> ClassificationAnalysisResponse:
    dataframe = _read_and_validate_csv(raw_csv, settings)
    _validate_plan_against_dataframe(plan, dataframe, settings, numeric_target=False)
    target = _series_column(dataframe, plan.targetColumn).astype("string")
    usable, usable_target = _usable_rows(dataframe, target)
    labels = sorted(str(label) for label in usable_target.unique())
    class_counts = usable_target.value_counts()
    if len(usable) < settings.min_usable_rows:
        raise AnalysisFailure(422, f"At least {settings.min_usable_rows} rows with a target value are required for classification.")
    if not 2 <= len(labels) <= settings.max_classification_classes:
        raise AnalysisFailure(422, f"Classification requires a target with between 2 and {settings.max_classification_classes} classes.")
    if (class_counts < 2).any():
        raise AnalysisFailure(422, "Each classification target class needs at least two usable rows.")

    features = _feature_frame(usable, plan)
    try:
        x_train, x_test, y_train, y_test = _train_test_split(features, usable_target, stratify=usable_target)
    except ValueError as error:
        raise AnalysisFailure(422, "This dataset cannot create the required stratified classification split.") from error

    model = Pipeline([
        ("preprocessor", _preprocessor(plan.preprocessing)),
        ("classifier", LogisticRegression(max_iter=1000)),
    ])
    baseline = DummyClassifier(strategy="most_frequent")
    try:
        model.fit(x_train, y_train)
    except ValueError as error:
        raise AnalysisFailure(422, "The classification model could not be fitted to this approved plan.") from error
    baseline.fit(x_train, y_train)

    model_predictions = _label_predictions(model.predict(x_test))
    baseline_predictions = _label_predictions(baseline.predict(x_test))
    model_metrics = _classification_metrics(y_test, model_predictions)
    baseline_metrics = _classification_metrics(y_test, baseline_predictions)
    improvement = ClassificationImprovement(
        f1Absolute=float(model_metrics.f1 - baseline_metrics.f1),
        f1Percent=_percentage_change(baseline_metrics.f1, model_metrics.f1),
    )
    quality = _quality(improvement.f1Absolute * 100)
    coverage = _dataset_coverage(x_train, x_test, plan.preprocessing)
    prediction_frame = _prediction_frame(plan)
    predicted_labels = _label_predictions(model.predict(prediction_frame))
    probabilities = model.predict_proba(prediction_frame)
    model_labels = [str(label) for label in model.named_steps["classifier"].classes_]
    predictions = [
        ClassificationPrediction(
            input=row,
            predictedClass=str(predicted),
            predictedProbability=float(probability[model_labels.index(str(predicted))]),
            coverage=_prediction_coverage(row, coverage),
        )
        for row, predicted, probability in zip(plan.predictionRows, predicted_labels, probabilities, strict=True)
    ]
    per_class = _per_class_metrics(y_test, model_predictions, labels)
    distribution = [
        ClassDistribution(classLabel=label, count=int(class_counts[label]), percentage=float(class_counts[label] / len(usable_target) * 100))
        for label in labels
    ]
    warnings = list(dict.fromkeys([
        *plan.warnings,
        *_prediction_warnings(predictions),
        *_classification_quality_warnings(quality),
        *_classification_imbalance_warnings(distribution, settings.class_imbalance_threshold_percent),
        *_safety_warnings(len(usable), settings),
        "Classifications are estimates based on historical dataset patterns; they are not guarantees.",
    ]))
    return ClassificationAnalysisResponse(
        analysisId=str(uuid4()), taskType="classification", model={"name": "LogisticRegression"},
        baseline={"name": "DummyClassifier (most_frequent)"}, quality=quality,
        metrics=ClassificationMetrics(model=model_metrics, baseline=baseline_metrics, improvement=improvement),
        predictions=predictions,
        charts=ClassificationCharts(
            confusionMatrix=ConfusionMatrix(
                labels=labels,
                values=confusion_matrix(y_test, model_predictions, labels=labels).astype(int).tolist(),
            ),
            classDistribution=distribution,
        ),
        perClassMetrics=per_class, datasetCoverage=coverage, warnings=warnings,
        explanationFacts={"targetColumn": plan.targetColumn, "usableRows": len(usable), "droppedMissingTargetRows": int(len(dataframe) - len(usable)), "classCount": len(labels)},
    )


def _read_and_validate_csv(raw_csv: bytes, settings: Settings) -> pd.DataFrame:
    if len(raw_csv) > settings.max_csv_bytes:
        raise AnalysisFailure(413, "CSV exceeds the configured file-size limit.")
    try:
        _validate_header(raw_csv)
        dataframe = pd.read_csv(io.BytesIO(raw_csv))
    except ProfileFailure as error:
        raise AnalysisFailure(error.status_code, error.detail) from error
    except (EmptyDataError, ParserError, UnicodeDecodeError) as error:
        raise AnalysisFailure(422, "CSV could not be parsed.") from error
    if dataframe.empty:
        raise AnalysisFailure(422, "CSV must contain at least one data row.")
    if len(dataframe.columns) > settings.max_csv_columns:
        raise AnalysisFailure(422, "CSV exceeds the configured column limit.")
    if len(dataframe.index) > settings.max_csv_rows:
        raise AnalysisFailure(422, "CSV exceeds the configured row limit.")
    return dataframe


def _validate_plan_against_dataframe(plan: BaseAnalysisPlan, dataframe: pd.DataFrame, settings: Settings, *, numeric_target: bool) -> None:
    columns = set(dataframe.columns.astype(str))
    if plan.targetColumn not in columns:
        raise AnalysisFailure(422, "The analysis target is not present in this CSV.")
    if len(set(plan.featureColumns)) != len(plan.featureColumns) or plan.targetColumn in plan.featureColumns:
        raise AnalysisFailure(422, "The analysis plan has invalid feature columns.")
    if any(feature not in columns for feature in plan.featureColumns):
        raise AnalysisFailure(422, "An analysis feature is not present in this CSV.")
    declared = plan.preprocessing.numeric + plan.preprocessing.categorical
    if len(set(declared)) != len(declared) or set(declared) != set(plan.featureColumns):
        raise AnalysisFailure(422, "The analysis preprocessing does not match the selected features.")
    if any(set(row) != set(plan.featureColumns) for row in plan.predictionRows):
        raise AnalysisFailure(422, "Prediction inputs do not match the selected features.")
    if len(plan.predictionRows) > settings.max_prediction_rows:
        raise AnalysisFailure(422, f"A maximum of {settings.max_prediction_rows} prediction row(s) can be analysed at once.")
    usable_dataframe = dataframe.loc[dataframe[plan.targetColumn].notna()]
    categorical_feature_count = 0
    for name in plan.preprocessing.categorical:
        category_count = usable_dataframe[name].dropna().astype(str).nunique()
        categorical_feature_count += category_count
        if category_count > settings.max_categorical_values:
            raise AnalysisFailure(422, f"Feature column '{name}' exceeds the {settings.max_categorical_values}-category limit.")
    if len(plan.preprocessing.numeric) + categorical_feature_count > settings.max_encoded_features:
        raise AnalysisFailure(422, f"Selected features would create more than {settings.max_encoded_features} encoded features.")
    try:
        if numeric_target:
            pd.to_numeric(dataframe[plan.targetColumn].dropna(), errors="raise")
        for name in plan.preprocessing.numeric:
            pd.to_numeric(dataframe[name].dropna(), errors="raise")
    except (TypeError, ValueError) as error:
        raise AnalysisFailure(422, "The CSV no longer matches the approved numeric analysis plan.") from error


def _series_column(dataframe: pd.DataFrame, name: str) -> pd.Series:
    column = dataframe[name]
    if not isinstance(column, pd.Series):
        raise AnalysisFailure(422, f"CSV column '{name}' must have a single header.")
    return column


def _train_test_split(
    features: pd.DataFrame,
    target: pd.Series,
    *,
    stratify: pd.Series | None = None,
) -> TrainTestSplit:
    return cast(
        TrainTestSplit,
        train_test_split(features, target, test_size=0.2, random_state=42, stratify=stratify),
    )


def _usable_rows(dataframe: pd.DataFrame, target: pd.Series) -> tuple[pd.DataFrame, pd.Series]:
    present = target.notna()
    return dataframe.loc[present].copy(), target.loc[present]


def _feature_frame(dataframe: pd.DataFrame, plan: BaseAnalysisPlan) -> pd.DataFrame:
    features = dataframe.loc[:, plan.featureColumns].copy()
    for name in plan.preprocessing.numeric:
        features[name] = pd.to_numeric(features[name], errors="raise")
    return features


def _prediction_frame(plan: BaseAnalysisPlan) -> pd.DataFrame:
    frame = pd.DataFrame.from_records(plan.predictionRows, columns=pd.Index(plan.featureColumns))
    for name in plan.preprocessing.numeric:
        frame[name] = pd.to_numeric(frame[name], errors="raise")
    return frame


def _preprocessor(preprocessing: PreprocessingPlan) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), preprocessing.numeric),
            ("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("encoder", OneHotEncoder(handle_unknown="ignore"))]), preprocessing.categorical),
        ],
        remainder="drop",
    )


def _float_predictions(values: object) -> FloatPredictions:
    return cast(FloatPredictions, np.asarray(values, dtype=np.float64).reshape(-1))


def _label_predictions(values: object) -> LabelPredictions:
    return cast(LabelPredictions, np.asarray(values, dtype=object).reshape(-1))


def _regression_metrics(actual: pd.Series, predicted: FloatPredictions) -> RegressionMetricValues:
    return RegressionMetricValues(
        mae=float(mean_absolute_error(actual, predicted)),
        rmse=float(mean_squared_error(actual, predicted) ** 0.5),
        r2=float(r2_score(actual, predicted)),
    )


def _regression_improvement(model: RegressionMetricValues, baseline: RegressionMetricValues) -> RegressionImprovement:
    return RegressionImprovement(
        maeAbsolute=float(baseline.mae - model.mae), maePercent=_reduction_percentage(baseline.mae, model.mae),
        rmseAbsolute=float(baseline.rmse - model.rmse), rmsePercent=_reduction_percentage(baseline.rmse, model.rmse),
        r2Absolute=float(model.r2 - baseline.r2),
    )


def _classification_metrics(actual: pd.Series, predicted: LabelPredictions) -> ClassificationMetricValues:
    precision, recall, f1, _ = precision_recall_fscore_support(actual, predicted, average="weighted", zero_division=cast(Any, 0))
    return ClassificationMetricValues(
        accuracy=float(accuracy_score(actual, predicted)), precision=float(precision), recall=float(recall), f1=float(f1),
    )


def _per_class_metrics(actual: pd.Series, predicted: LabelPredictions, labels: list[str]) -> list[PerClassMetrics]:
    precision, recall, f1, support = cast(
        PerClassMetricArrays,
        precision_recall_fscore_support(actual, predicted, labels=labels, zero_division=cast(Any, 0)),
    )
    return [
        PerClassMetrics(classLabel=label, precision=float(item_precision), recall=float(item_recall), f1=float(item_f1), support=int(item_support))
        for label, item_precision, item_recall, item_f1, item_support in zip(labels, precision, recall, f1, support, strict=True)
    ]


def _percentage_change(baseline: float, model: float) -> float:
    return 0.0 if baseline == 0 else float((model - baseline) / baseline * 100)


def _reduction_percentage(baseline: float, model: float) -> float:
    return 0.0 if baseline == 0 else float((baseline - model) / baseline * 100)


def _quality(improvement_percent: float) -> Literal["useful_signal", "weak_signal", "no_demonstrated_signal"]:
    if improvement_percent >= 5:
        return "useful_signal"
    if improvement_percent > 0:
        return "weak_signal"
    return "no_demonstrated_signal"


def _dataset_coverage(training: pd.DataFrame, testing: pd.DataFrame, preprocessing: PreprocessingPlan) -> DatasetCoverage:
    numeric_ranges = {name: {"min": float(training[name].min()), "max": float(training[name].max())} for name in preprocessing.numeric}
    categorical_values = {name: sorted(str(value) for value in training[name].dropna().astype(str).unique()) for name in preprocessing.categorical}
    return DatasetCoverage(trainingRows=len(training), testRows=len(testing), numericRanges=numeric_ranges, categoricalValues=categorical_values)


def _prediction_coverage(row: dict[str, Scalar], coverage: DatasetCoverage) -> PredictionCoverage:
    outside = [name for name, bounds in coverage.numericRanges.items() if float(row[name]) < bounds["min"] or float(row[name]) > bounds["max"]]
    unseen = [name for name, known in coverage.categoricalValues.items() if str(row[name]) not in known]
    return PredictionCoverage(outsideNumericRanges=outside, unseenCategoricalValues=unseen)


def _prediction_warnings(predictions: Sequence[RegressionPrediction | ClassificationPrediction]) -> list[str]:
    warnings: list[str] = []
    for index, prediction in enumerate(predictions, start=1):
        if prediction.coverage.outsideNumericRanges:
            warnings.append(f"Prediction row {index} is outside the training range for {', '.join(prediction.coverage.outsideNumericRanges)}.")
        if prediction.coverage.unseenCategoricalValues:
            warnings.append(f"Prediction row {index} contains unseen training categories for {', '.join(prediction.coverage.unseenCategoricalValues)}.")
    return warnings


def _regression_quality_warnings(quality: str, metrics: RegressionMetricValues) -> list[str]:
    warnings: list[str] = []
    if quality == "no_demonstrated_signal":
        warnings.append("The model did not outperform the training-mean baseline on MAE.")
    if metrics.r2 < 0:
        warnings.append("Negative R² means the model performed worse than predicting the training mean on this test split.")
    return warnings


def _classification_quality_warnings(quality: str) -> list[str]:
    if quality == "no_demonstrated_signal":
        return ["The model did not outperform the most-frequent-class baseline on weighted F1."]
    return []


def _classification_imbalance_warnings(distribution: list[ClassDistribution], threshold_percent: float) -> list[str]:
    minority = min(distribution, key=lambda item: item.percentage)
    if minority.percentage < threshold_percent:
        return [
            f"Class '{minority.classLabel}' represents {minority.percentage:.1f}% of usable rows, below the {threshold_percent:.1f}% imbalance threshold."
        ]
    return []


def _safety_warnings(usable_rows: int, settings: Settings) -> list[str]:
    warnings = [
        "Selected features may omit important explanatory factors; results describe associations, not causes.",
        "Historical data may reflect bias or unequal outcomes; do not use this result as the sole basis for high-impact decisions.",
    ]
    if usable_rows < settings.small_dataset_warning_rows:
        warnings.insert(0, f"Only {usable_rows} usable row(s) are available; estimates may be unstable for this small dataset.")
    return warnings
