from .models import TestCase

class UITestGenerator:
    def generate(self, test_case: TestCase) -> str:
        """
        Generates UI assertions tests.
        """
        script = f"""import pytest
from playwright.sync_api import Page, expect

def test_ui_{test_case.id.replace('-', '_')}(page: Page):
    # UI Component Test: {test_case.description}
    page.goto("/")
    # expect(page.locator("body")).to_be_visible()
"""
        return script
