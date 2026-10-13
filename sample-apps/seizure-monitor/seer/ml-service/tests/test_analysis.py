from app.analysis import (
    AnalysisFailure,
    ClassificationAnalysisPlan,
    RegressionAnalysisPlan,
    analyze_classification_csv,
    analyze_regression_csv,
)
from app.config import Settings
from app.main import create_app
from fastapi.testclient import TestClient
import json
import pytest


def make_plan(prediction_rows: list[dict[str, str | int | float | bool]] | None = None) -> RegressionAnalysisPlan:
    return RegressionAnalysisPlan.model_validate({
        "datasetId": "employee-compensation",
        "question": "Estimate salary",
        "targetColumn": "annual_salary",
        "featureColumns": ["years_experience", "department"],
        "taskType": "regression",
        "predictionRows": prediction_rows or [{"years_experience": 10, "department": "engineering"}],
        "preprocessing": {"numeric": ["years_experience"], "categorical": ["department"], "numericImputer": "median", "numericScaler": "standard", "categoricalImputer": "most_frequent", "categoricalEncoder": "one_hot"},
        "warnings": [],
        "split": {"trainingPercent": 80, "testPercent": 20, "randomState": 42},
    })


def regression_csv() -> bytes:
    rows = ["years_experience,department,annual_salary"]
    for index in range(40):
        department = "engineering" if index % 2 else "sales"
        salary = 50000 + index * 3100 + (9000 if department == "engineering" else 0)
        rows.append(f"{index + 1},{department},{salary}")
    return ("\n".join(rows) + "\n").encode()


def settings() -> Settings:
    return Settings(api_key="test-secret")


def make_classification_plan(prediction_rows: list[dict[str, str | int | float | bool]] | None = None) -> ClassificationAnalysisPlan:
    return ClassificationAnalysisPlan.model_validate({
        "datasetId": "employee-attrition",
        "question": "Is this employee likely to leave?",
        "targetColumn": "attrition",
        "featureColumns": ["tenure_years", "monthly_hours", "department"],
        "taskType": "classification",
        "predictionRows": prediction_rows or [{"tenure_years": 2, "monthly_hours": 228, "department": "sales"}],
        "preprocessing": {"numeric": ["tenure_years", "monthly_hours"], "categorical": ["department"], "numericImputer": "median", "numericScaler": "standard", "categoricalImputer": "most_frequent", "categoricalEncoder": "one_hot"},
        "warnings": [],
        "split": {"trainingPercent": 80, "testPercent": 20, "randomState": 42},
    })


def classification_csv() -> bytes:
    rows = ["tenure_years,monthly_hours,department,attrition"]
    for index in range(30):
        rows.append(f"{index % 5 + 1},{218 + index % 18},sales,leave")
    for index in range(30):
        rows.append(f"{index % 8 + 5},{165 + index % 22},engineering,stay")
    return ("\n".join(rows) + "\n").encode()


def test_mixed_feature_regression_returns_metrics_predictions_and_diagnostics() -> None:
    result = analyze_regression_csv(regression_csv(), make_plan(), settings())

    assert result.taskType == "regression"
    assert result.model["name"] == "LinearRegression"
    assert result.baseline["name"] == "DummyRegressor (mean)"
    assert result.datasetCoverage.trainingRows == 32
    assert result.datasetCoverage.testRows == 8
    assert len(result.charts.actualVsPredicted) == 8
    assert len(result.charts.residualVsPredicted) == 8
    assert result.metrics.model.mae < result.metrics.baseline.mae
    assert result.predictions[0].estimatedValue > 0
    assert any("small dataset" in warning for warning in result.warnings)
    assert any("associations, not causes" in warning for warning in result.warnings)
    assert any("bias or unequal outcomes" in warning for warning in result.warnings)


def test_unseen_categories_and_extrapolation_are_disclosed() -> None:
    result = analyze_regression_csv(
        regression_csv(),
        make_plan([{"years_experience": 200, "department": "research"}]),
        settings(),
    )

    coverage = result.predictions[0].coverage
    assert coverage.outsideNumericRanges == ["years_experience"]
    assert coverage.unseenCategoricalValues == ["department"]
    assert any("outside the training range" in warning for warning in result.warnings)
    assert any("unseen training categories" in warning for warning in result.warnings)


def test_missing_targets_are_excluded_after_the_plan_is_validated() -> None:
    csv = regression_csv().decode().replace("3,sales,56200", "3,sales,")
    result = analyze_regression_csv(csv.encode(), make_plan(), settings())

    assert result.explanationFacts["droppedMissingTargetRows"] == 1
    assert result.explanationFacts["usableRows"] == 39


def test_missing_numeric_and_categorical_features_are_imputed_from_training_data() -> None:
    csv = regression_csv().decode()
    csv = csv.replace("4,engineering,68300", ",engineering,68300")
    csv = csv.replace("5,sales,62400", "5,,62400")

    result = analyze_regression_csv(csv.encode(), make_plan(), settings())

    assert result.datasetCoverage.trainingRows == 32
    assert len(result.charts.actualVsPredicted) == 8


def test_constant_regression_targets_are_rejected() -> None:
    csv = "years_experience,department,annual_salary\n" + "\n".join(
        f"{index},engineering,100000" for index in range(1, 25)
    )

    with pytest.raises(AnalysisFailure, match="five distinct values"):
        analyze_regression_csv(csv.encode(), make_plan(), settings())


def test_analyze_endpoint_accepts_the_full_signed_plan_shape() -> None:
    full_plan = make_plan().model_dump()
    full_plan.update({
        "rows": {"dataset": 40, "missingTarget": 0, "usable": 40},
        "excludedColumns": [],
        "assumptions": [],
    })
    with TestClient(create_app(settings())) as client:
        response = client.post(
            "/v1/analyze",
            headers={"Authorization": "Bearer test-secret"},
            files={"file": ("employee-compensation.csv", regression_csv(), "text/csv")},
            data={"plan": json.dumps(full_plan)},
        )

    assert response.status_code == 200
    assert response.json()["taskType"] == "regression"


def test_mixed_feature_classification_returns_probabilities_and_evaluation() -> None:
    result = analyze_classification_csv(classification_csv(), make_classification_plan(), settings())

    assert result.taskType == "classification"
    assert result.model["name"] == "LogisticRegression"
    assert result.baseline["name"] == "DummyClassifier (most_frequent)"
    assert result.datasetCoverage.trainingRows == 48
    assert result.datasetCoverage.testRows == 12
    assert result.metrics.model.f1 > result.metrics.baseline.f1
    assert result.quality == "useful_signal"
    assert result.predictions[0].predictedClass in {"leave", "stay"}
    assert 0 <= result.predictions[0].predictedProbability <= 1
    assert result.charts.confusionMatrix.labels == ["leave", "stay"]
    assert len(result.perClassMetrics) == 2
    assert any("small dataset" in warning for warning in result.warnings)
    assert any("associations, not causes" in warning for warning in result.warnings)
    assert any("bias or unequal outcomes" in warning for warning in result.warnings)


def test_classification_rejects_a_class_without_enough_rows() -> None:
    csv = b"tenure_years,monthly_hours,department,attrition\n" + b"\n".join(
        [b"1,220,sales,leave"] * 19 + [b"8,170,engineering,stay"]
    )
    with pytest.raises(AnalysisFailure, match="at least two usable rows"):
        analyze_classification_csv(csv, make_classification_plan(), settings())


def test_classification_discloses_material_class_imbalance() -> None:
    rows = ["tenure_years,monthly_hours,department,attrition"]
    rows.extend(f"{index % 5 + 1},{218 + index % 18},sales,leave" for index in range(30))
    rows.extend(f"{index % 8 + 5},{165 + index % 22},engineering,stay" for index in range(5))

    result = analyze_classification_csv("\n".join(rows).encode(), make_classification_plan(), settings())

    assert any("below the 20.0% imbalance threshold" in warning for warning in result.warnings)


def test_analysis_enforces_configured_prediction_row_limit() -> None:
    configured_settings = Settings(api_key="test-secret", max_prediction_rows=1)
    with pytest.raises(AnalysisFailure, match="maximum of 1 prediction row"):
        analyze_regression_csv(
            regression_csv(),
            make_plan([
                {"years_experience": 10, "department": "engineering"},
                {"years_experience": 11, "department": "sales"},
            ]),
            configured_settings,
        )


def test_classification_endpoint_accepts_the_full_signed_plan_shape() -> None:
    full_plan = make_classification_plan().model_dump()
    full_plan.update({
        "rows": {"dataset": 60, "missingTarget": 0, "usable": 60},
        "excludedColumns": [],
        "assumptions": [],
    })
    with TestClient(create_app(settings())) as client:
        response = client.post(
            "/v1/analyze",
            headers={"Authorization": "Bearer test-secret"},
            files={"file": ("employee-attrition.csv", classification_csv(), "text/csv")},
            data={"plan": json.dumps(full_plan)},
        )

    assert response.status_code == 200
    assert response.json()["taskType"] == "classification"
