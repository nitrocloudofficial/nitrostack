from .models import TestCase

class FormTestGenerator:
    def generate(self, test_case: TestCase) -> str:
        """
        Scaffolds tests validating HTML forms and fields.
        """
        script = f"""import pytest
from playwright.sync_api import Page, expect

def test_form_{test_case.id.replace('-', '_')}(page: Page):
    # Form Test: {test_case.description}
    # Expected validations logic
    pass
"""
        return script
