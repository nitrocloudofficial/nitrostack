from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(**limits: int) -> TestClient:
    settings = Settings(api_key="test-secret", **limits)
    return TestClient(create_app(settings))


def profile(client: TestClient, csv: str, dataset_id: str = "employee-compensation"):
    return client.post(
        "/v1/profile",
        headers={"Authorization": "Bearer test-secret"},
        files={"file": ("employee-compensation.csv", csv.encode(), "text/csv")},
        data={"dataset_id": dataset_id},
    )


def test_profile_returns_mixed_type_profile_data() -> None:
    csv = """employee_id,years_experience,department,annual_salary,notes
EMP001,3,engineering,80000,excellent communicator
EMP002,,sales,65000,requires onboarding
EMP003,8,engineering,110000,mentors teammates
EMP003,8,engineering,110000,mentors teammates
"""
    with make_client(max_categorical_values=2) as client:
        response = profile(client, csv)

    assert response.status_code == 200
    body = response.json()
    assert body["datasetId"] == "employee-compensation"
    assert body["dimensions"] == {"rows": 4, "columns": 5}
    assert body["duplicateRowCount"] == 1
    assert body["identifierCandidates"] == ["employee_id"]
    assert body["targetCandidates"] == ["years_experience", "department", "annual_salary"]
    columns = {column["name"]: column for column in body["columns"]}
    assert columns["years_experience"]["type"] == "numeric"
    assert columns["years_experience"]["missingCount"] == 1
    assert columns["department"]["categories"][0] == {"value": "engineering", "count": 3, "percentage": 75.0}
    assert {column["name"] for column in body["unsupportedColumns"]} == {"notes"}


def test_profile_endpoint_returns_dimensions_with_request_context() -> None:
    with make_client() as client:
        response = profile(client, "annual_salary\n80000\n90000\n")

    assert response.status_code == 200
    assert response.json()["dimensions"] == {"rows": 2, "columns": 1}


def test_profile_rejects_missing_or_invalid_api_keys() -> None:
    with make_client() as client:
        response = client.post("/v1/profile")

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_service_echoes_a_valid_request_id() -> None:
    with make_client() as client:
        response = client.get(
            "/health",
            headers={"Authorization": "Bearer test-secret", "X-Request-ID": "mcp-request-42"},
        )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "mcp-request-42"


def test_profile_rejects_duplicate_headers_and_empty_csv() -> None:
    with make_client() as client:
        duplicate = profile(client, "name,name\na,b\n")
        empty = profile(client, "name\n")

    assert duplicate.status_code == 422
    assert duplicate.json() == {"detail": "CSV column names must be unique."}
    assert empty.status_code == 422
    assert empty.json() == {"detail": "CSV must contain at least one data row."}


def test_profile_enforces_configured_limits() -> None:
    with make_client(max_csv_rows=1) as client:
        response = profile(client, "salary\n80000\n90000\n")

    assert response.status_code == 422
    assert response.json() == {"detail": "CSV exceeds the configured row limit."}
