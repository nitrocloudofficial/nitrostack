"""DOM Analyzer for extracting structured UI elements from web pages."""

import asyncio
from typing import List, Dict, Any, Optional
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.element import UIElement, ElementType, BoundingBox
from agents.explorer.models.page import PageNode, PageMetadata
from agents.explorer.interfaces import AbstractDOMAnalyzer
from agents.explorer.utils.helpers import compute_element_hash, normalize_url
from agents.explorer.utils.constants import INTERACTIVE_TAGS, INTERACTIVE_ROLES
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class DOMAnalyzer(AbstractDOMAnalyzer):
    """Parses page DOM to discover, classify, and locate interactive UI components."""

    def __init__(self, browser_controller: BrowserController):
        self.browser = browser_controller

    async def extract_page_node(self, page_url: str) -> PageNode:
        """Extract complete PageNode including title, elements, and page metadata."""
        page = self.browser.page
        normalized_url = normalize_url(page_url)
        title = await page.title()

        elements = await self.extract_elements()
        metadata = await self._extract_metadata()

        forms_count = len([e for e in elements if e.element_type == ElementType.FORM])
        tables_count = len([e for e in elements if e.element_type == ElementType.TABLE])

        page_id = f"page_{compute_element_hash('page', normalized_url)}"

        return PageNode(
            page_id=page_id,
            url=normalized_url,
            title=title,
            elements=elements,
            forms_count=forms_count,
            tables_count=tables_count,
            metadata=metadata,
            is_authenticated=self.browser.is_authenticated,
        )

    async def extract_elements(self) -> List[UIElement]:
        """Extract all interactive and key structural elements on active page using JS DOM evaluation."""
        page = self.browser.page

        # JavaScript snippet to extract elements with position, visibility, unique selectors, and XPaths
        js_script = """
        () => {
            const results = [];
            const interactiveQuery = 'button, a, input, select, textarea, details, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], form, table, [role="dialog"]';
            const nodes = document.querySelectorAll(interactiveQuery);

            function getCssSelector(el) {
                if (el.id) return '#' + el.id;
                if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
                if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
                let path = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.tagName.toLowerCase();
                    if (el.id) {
                        selector += '#' + el.id;
                        path.unshift(selector);
                        break;
                    } else {
                        let sib = el, nth = 1;
                        while (sib = sib.previousElementSibling) {
                            if (sib.tagName === el.tagName) nth++;
                        }
                        if (nth !== 1) selector += ":nth-of-type(" + nth + ")";
                    }
                    path.unshift(selector);
                    el = el.parentElement;
                }
                return path.join(" > ");
            }

            function getXPath(el) {
                if (el.id) return `//*[@id="${el.id}"]`;
                const parts = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    let count = 0;
                    let sibling = el.previousSibling;
                    while (sibling) {
                        if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE && sibling.nodeName === el.nodeName) {
                            count++;
                        }
                        sibling = sibling.previousSibling;
                    }
                    const tagName = el.nodeName.toLowerCase();
                    const index = count > 0 ? `[${count + 1}]` : '';
                    parts.unshift(`${tagName}${index}`);
                    el = el.parentNode;
                }
                return parts.length ? '/' + parts.join('/') : '';
            }

            nodes.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isVisible = !!(rect.width || rect.height || el.getClientRects().length) && style.visibility !== 'hidden' && style.display !== 'none';
                const isEnabled = !el.disabled;

                const attrs = {};
                for (let attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }

                results.push({
                    tagName: el.tagName.toLowerCase(),
                    text: (el.innerText || el.value || el.alt || el.title || '').trim(),
                    selector: getCssSelector(el),
                    xpath: getXPath(el),
                    isVisible: isVisible,
                    isEnabled: isEnabled,
                    attributes: attrs,
                    ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || null,
                    placeholder: el.getAttribute('placeholder') || null,
                    rect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                });
            });

            return results;
        }
        """

        try:
            raw_elements = await page.evaluate(js_script)
        except Exception as e:
            logger.error(f"Error evaluating DOM extraction script: {e}")
            return []

        elements: List[UIElement] = []
        for raw in raw_elements:
            tag = raw["tagName"]
            selector = raw["selector"]
            text = raw["text"]

            elem_type = self._classify_element(tag, raw["attributes"])
            elem_id = f"elem_{compute_element_hash(tag, selector, text)}"

            bbox = None
            if raw["rect"]["width"] > 0 and raw["rect"]["height"] > 0:
                bbox = BoundingBox(
                    x=float(raw["rect"]["x"]),
                    y=float(raw["rect"]["y"]),
                    width=float(raw["rect"]["width"]),
                    height=float(raw["rect"]["height"])
                )

            elements.append(UIElement(
                element_id=elem_id,
                tag_name=tag,
                element_type=elem_type,
                text=text[:200],  # Truncate very long texts
                css_selector=selector,
                xpath=raw.get("xpath"),
                attributes=raw.get("attributes", {}),
                is_visible=raw.get("isVisible", True),
                is_enabled=raw.get("isEnabled", True),
                bounding_box=bbox,
                aria_label=raw.get("ariaLabel"),
                placeholder=raw.get("placeholder"),
            ))

        logger.debug(f"Extracted {len(elements)} elements from page.")
        return elements

    def _classify_element(self, tag_name: str, attrs: Dict[str, str]) -> ElementType:
        role = attrs.get("role", "").lower()
        input_type = attrs.get("type", "").lower()

        if tag_name == "button" or role == "button":
            return ElementType.BUTTON
        elif tag_name == "a" or role == "link":
            return ElementType.LINK
        elif tag_name == "select" or role == "combobox":
            return ElementType.SELECT
        elif tag_name == "textarea":
            return ElementType.TEXTAREA
        elif tag_name == "input":
            if input_type in ("button", "submit", "reset"):
                return ElementType.BUTTON
            elif input_type == "checkbox":
                return ElementType.CHECKBOX
            elif input_type == "radio":
                return ElementType.RADIO
            elif input_type == "file":
                return ElementType.FILE_UPLOAD
            return ElementType.INPUT
        elif tag_name == "form":
            return ElementType.FORM
        elif tag_name == "table":
            return ElementType.TABLE
        elif role == "dialog" or tag_name == "dialog":
            return ElementType.MODAL_DIALOG
        elif role == "tab":
            return ElementType.TAB
        elif role in ("menuitem", "option"):
            return ElementType.MENU_ITEM
        return ElementType.CUSTOM

    async def _extract_metadata(self) -> PageMetadata:
        page = self.browser.page
        meta_desc = None
        headings = []
        try:
            meta_desc = await page.get_attribute("meta[name='description']", "content")
            headings = await page.locator("h1, h2, h3").all_inner_texts()
            headings = [h.strip() for h in headings if h.strip()]
        except Exception:
            pass

        return PageMetadata(
            meta_description=meta_desc,
            headings=headings[:10]
        )
