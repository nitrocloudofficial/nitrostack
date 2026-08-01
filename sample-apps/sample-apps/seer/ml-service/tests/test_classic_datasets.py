from pathlib import Path

import pytest

from app.analysis import (
    ClassificationAnalysisPlan,
    RegressionAnalysisPlan,
    analyze_classification_csv,
    analyze_regression_csv,
)
from app.config import Settings
from app.profiling import profile_csv


DATA_DIRECTORY = Path(__file__).resolve().parents[2] / "src" / "data"
SETTINGS = Settings(api_key="test-secret")


@pytest.mark.parametrize(
    ("dataset_id", "rows", "columns", "target"),
    [
        ("iris", 150, 5, "species"),
        ("titanic", 1309, 8, "survived"),
        ("wine", 178, 14, "cultivar"),
        ("auto-mpg", 398, 8, "mpg"),
    ],
)
def test_classic_dataset_snapshots_are_profileable(
    dataset_id: str, rows: int, columns: int, target: str
) -> None:
    result = profile_csv(
        dataset_id, (DATA_DIRECTORY / f"{dataset_id}.csv").read_bytes(), SETTINGS
    )

    assert result.dimensions == {"rows": rows, "columns": columns}
    assert target in result.targetCandidates


def test_iris_runs_as_a_multiclass_classification_example() -> None:
    plan = ClassificationAnalysisPlan.model_validate(
        {
            "datasetId": "iris",
            "question": "Which iris species is estimated from these measurements?",
            "targetColumn": "species",
            "featureColumns": [
                "sepal_length_cm",
                "sepal_width_cm",
                "petal_length_cm",
                "petal_width_cm",
            ],
            "taskType": "classification",
            "predictionRows": [
                {
                    "sepal_length_cm": 5.1,
                    "sepal_width_cm": 3.5,
                    "petal_length_cm": 1.4,
                    "petal_width_cm": 0.2,
                }
            ],
            "preprocessing": {
                "numeric": [
                    "sepal_length_cm",
                    "sepal_width_cm",
                    "petal_length_cm",
                    "petal_width_cm",
                ],
                "categorical": [],
                "numericImputer": "median",
                "numericScaler": "standard",
                "categoricalImputer": "most_frequent",
                "categoricalEncoder": "one_hot",
            },
            "warnings": [],
            "split": {"trainingPercent": 80, "testPercent": 20, "randomState": 42},
        }
    )

    result = analyze_classification_csv(
        (DATA_DIRECTORY / "iris.csv").read_bytes(), plan, SETTINGS
    )

    assert result.taskType == "classification"
    assert result.predictions[0].predictedClass in {
        "setosa",
        "versicolor",
        "virginica",
    }


def test_auto_mpg_runs_as_a_regression_example() -> None:
    plan = RegressionAnalysisPlan.model_validate(
        {
            "datasetId": "auto-mpg",
            "question": "What fuel economy is estimated for this vehicle?",
            "targetColumn": "mpg",
            "featureColumns": [
                "cylinders",
                "displacement",
                "horsepower",
                "weight",
                "acceleration",
                "model_year",
                "origin",
            ],
            "taskType": "regression",
            "predictionRows": [
                {
                    "cylinders": 4,
                    "displacement": 140.0,
                    "horsepower": 90.0,
                    "weight": 2400.0,
                    "acceleration": 15.0,
                    "model_year": 78,
                    "origin": "usa",
                }
            ],
            "preprocessing": {
                "numeric": [
                    "cylinders",
                    "displacement",
                    "horsepower",
                    "weight",
                    "acceleration",
                    "model_year",
                ],
                "categorical": ["origin"],
                "numericImputer": "median",
                "numericScaler": "standard",
                "categoricalImputer": "most_frequent",
                "categoricalEncoder": "one_hot",
            },
            "warnings": [],
            "split": {"trainingPercent": 80, "testPercent": 20, "randomState": 42},
        }
    )

    result = analyze_regression_csv(
        (DATA_DIRECTORY / "auto-mpg.csv").read_bytes(), plan, SETTINGS
    )

    assert result.taskType == "regression"
    assert result.predictions[0].estimatedValue > 0
