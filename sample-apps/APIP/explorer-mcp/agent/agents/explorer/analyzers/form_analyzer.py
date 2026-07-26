"""Form Analyzer for detecting and extracting form inputs and validation states."""

from typing import List, Optional
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.form import FormModel, FormField, FieldType
from agents.explorer.interfaces import AbstractFormAnalyzer
from agents.explorer.utils.helpers import compute_element_hash
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class FormAnalyzer(AbstractFormAnalyzer):
    """Analyzes web forms, extracting field structures, required attributes, input types, and validation messages."""

    def __init__(self, browser_controller: BrowserController):
        self.browser = browser_controller

    async def extract_forms(self, page_url: str) -> List[FormModel]:
        """Extract all forms on active page."""
        page = self.browser.page

        js_script = """
        () => {
            const formsData = [];
            const forms = document.querySelectorAll('form');

            function getCssSelector(el) {
                if (el.id) return '#' + el.id;
                if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
                if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
                return el.tagName.toLowerCase();
            }

            forms.forEach((form, fIdx) => {
                const formSelector = getCssSelector(form) || `form:nth-of-type(${fIdx + 1})`;
                const fields = [];
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');

                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach((input, iIdx) => {
                    const tag = input.tagName.toLowerCase();
                    const type = (input.getAttribute('type') || tag).toLowerCase();
                    const name = input.name || input.id || null;
                    const isRequired = input.required || input.hasAttribute('aria-required');
                    
                    // Look for associated label text
                    let labelText = null;
                    if (input.id) {
                        const lbl = document.querySelector(`label[for="${input.id}"]`);
                        if (lbl) labelText = lbl.innerText.trim();
                    }
                    if (!labelText && input.closest('label')) {
                        labelText = input.closest('label').innerText.trim();
                    }

                    // Extract options if select
                    const options = [];
                    if (tag === 'select') {
                        input.querySelectorAll('option').forEach(opt => options.push(opt.text.trim()));
                    }

                    // Extract validation message
                    const valMsg = input.validationMessage || null;

                    fields.push({
                        name: name,
                        label: labelText,
                        type: type,
                        selector: getCssSelector(input) || `${formSelector} ${tag}:nth-of-type(${iIdx + 1})`,
                        isRequired: isRequired,
                        options: options,
                        currentValue: input.value || null,
                        placeholder: input.placeholder || null,
                        validationMessage: valMsg
                    });
                });

                formsData.push({
                    nameOrId: form.id || form.name || null,
                    selector: formSelector,
                    actionUrl: form.action || null,
                    method: (form.method || 'POST').toUpperCase(),
                    fields: fields,
                    submitSelector: submitBtn ? getCssSelector(submitBtn) : null
                });
            });

            return formsData;
        }
        """

        try:
            raw_forms = await page.evaluate(js_script)
        except Exception as e:
            logger.error(f"Error extracting forms: {e}")
            return []

        forms: List[FormModel] = []
        for raw in raw_forms:
            form_fields: List[FormField] = []
            for f in raw["fields"]:
                field_type = self._map_field_type(f["type"])
                f_id = f"fld_{compute_element_hash(f['type'], f['selector'], f.get('name') or '')}"

                form_fields.append(FormField(
                    field_id=f_id,
                    name=f["name"],
                    label=f["label"],
                    field_type=field_type,
                    css_selector=f["selector"],
                    is_required=f["isRequired"],
                    options=f["options"],
                    current_value=f["currentValue"],
                    placeholder=f["placeholder"],
                    validation_message=f.get("validationMessage")
                ))

            form_id = f"form_{compute_element_hash('form', raw['selector'])}"
            forms.append(FormModel(
                form_id=form_id,
                name_or_id=raw["nameOrId"],
                css_selector=raw["selector"],
                action_url=raw["actionUrl"],
                method=raw["method"],
                fields=form_fields,
                submit_button_selector=raw["submitSelector"],
                page_url=page_url
            ))

        logger.debug(f"Analyzed {len(forms)} forms on page {page_url}.")
        return forms

    def _map_field_type(self, type_str: str) -> FieldType:
        type_str = type_str.lower()
        if type_str in ("text", "search"):
            return FieldType.TEXT
        elif type_str == "password":
            return FieldType.PASSWORD
        elif type_str == "email":
            return FieldType.EMAIL
        elif type_str in ("number", "range"):
            return FieldType.NUMBER
        elif type_str == "checkbox":
            return FieldType.CHECKBOX
        elif type_str == "radio":
            return FieldType.RADIO
        elif type_str == "select":
            return FieldType.SELECT
        elif type_str == "textarea":
            return FieldType.TEXTAREA
        elif type_str == "file":
            return FieldType.FILE
        elif type_str in ("date", "datetime-local", "time", "month"):
            return FieldType.DATE
        elif type_str in ("submit", "button"):
            return FieldType.SUBMIT
        return FieldType.OTHER
