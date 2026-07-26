"""Constants used across the Explorer Agent."""

DEFAULT_VIEWPORT_WIDTH = 1280
DEFAULT_VIEWPORT_HEIGHT = 800
DEFAULT_TIMEOUT_MS = 10000
DEFAULT_MAX_DEPTH = 3
DEFAULT_MAX_ACTIONS = 50
DEFAULT_HEADLESS = True

INTERACTIVE_TAGS = {
    "a", "button", "input", "select", "textarea", "details", "summary"
}

INTERACTIVE_ROLES = {
    "button", "link", "checkbox", "radio", "combobox", "option", "tab",
    "menuitem", "menuitemcheckbox", "menuitemradio", "switch", "textbox",
    "searchbox", "spinbutton", "slider", "treeitem"
}

IGNORED_URL_SCHEMES = {
    "mailto:", "tel:", "javascript:", "data:", "blob:"
}
