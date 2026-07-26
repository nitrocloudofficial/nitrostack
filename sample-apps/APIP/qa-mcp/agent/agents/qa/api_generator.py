from .models import TestCase

class APITestGenerator:
    def generate(self, test_case: TestCase) -> str:
        """
        Generates Pytest API tests via requests based on API graph entity.
        """
        script = f"""import requests

def test_api_{test_case.id.replace('-', '_')}():
    # API Test: {test_case.description}
    response = requests.get("http://localhost:8000")
    assert response.status_code == 200
"""
        return script
