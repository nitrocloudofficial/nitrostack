import os
import sys
import json
import re
import time
from playwright.sync_api import sync_playwright

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

class GeminiWebLLM:
    """Automates gemini.google.com via Playwright to generate AI responses without an API key."""
    
    def __init__(self, user_data_dir: str = None, headless: bool = False):
        if user_data_dir is None:
            self.user_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "gemini_user_data"))
        else:
            self.user_data_dir = user_data_dir
        self.headless = headless

    def ask_gemini(self, prompt: str, timeout: int = 120) -> str:
        """Sends a prompt to Gemini Web App and captures the response text."""
        print(f"[GeminiWebLLM] Opening Chromium Browser window (headless={self.headless}) to gemini.google.com...")
        
        try:
            with sync_playwright() as p:
                browser = None
                # Try opening persistent context with retry for profile lock
                for attempt in range(3):
                    try:
                        browser = p.chromium.launch_persistent_context(
                            user_data_dir=self.user_data_dir,
                            headless=self.headless,
                            args=["--disable-blink-features=AutomationControlled"]
                        )
                        break
                    except Exception as lock_err:
                        if attempt < 2:
                            time.sleep(2.5)
                        else:
                            # Fallback to temp user data dir if main profile is locked
                            fallback_dir = self.user_data_dir + f"_run_{os.getpid()}"
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=fallback_dir,
                                headless=self.headless,
                                args=["--disable-blink-features=AutomationControlled"]
                            )
                
                page = browser.new_page()
                
                try:
                    page.goto("https://gemini.google.com/app", wait_until="load", timeout=45000)
                    page.wait_for_timeout(2000)
                    
                    # Locate input textbox
                    selectors = [
                        'div[contenteditable="true"]',
                        'div[role="textbox"]',
                        'textarea[placeholder*="Ask"]',
                        'textarea[placeholder*="prompt"]',
                        'textarea'
                    ]
                    textbox = None
                    for sel in selectors:
                        try:
                            el = page.query_selector(sel)
                            if el and el.is_visible():
                                textbox = el
                                break
                        except Exception:
                            pass
                    
                    if not textbox:
                        print("[GeminiWebLLM] Textbox not available or user not logged in on Gemini web app. Returning fallback.")
                        browser.close()
                        return ""
                    
                    # Type & Submit Prompt
                    textbox.focus()
                    page.evaluate("""([el, val]) => { 
                        el.textContent = val; 
                        el.dispatchEvent(new Event('input', { bubbles: true })); 
                    }""", [textbox, prompt])
                    page.wait_for_timeout(500)
                    page.keyboard.press("Enter")
                    
                    print("[GeminiWebLLM] Prompt submitted to Web Gemini. Streaming response...")
                    
                    # Poll for response completion
                    last_text = ""
                    stable_count = 0
                    for _ in range(timeout):
                        page.wait_for_timeout(1000)
                        current_text = page.evaluate("""() => {
                            const sel = ['.message-content', '.markdown', 'div.markdown', '.response-content'];
                            for (const s of sel) {
                                const els = document.querySelectorAll(s);
                                if (els.length > 0) {
                                    return els[els.length - 1].innerText;
                                }
                            }
                            return '';
                        }""")
                        
                        if current_text and current_text == last_text and len(current_text) > 10:
                            stable_count += 1
                            # Check if HTML ends cleanly or response has been completely stable for 5 checks
                            is_html_complete = '</html>' in current_text.lower()
                            if (is_html_complete and stable_count >= 3) or stable_count >= 6:
                                break
                        else:
                            stable_count = 0
                            last_text = current_text
                    
                    print(f"[GeminiWebLLM] Successfully received AI response ({len(last_text)} chars) from Web Gemini!")
                    browser.close()
                    return last_text
                    
                except Exception as e:
                    print(f"[GeminiWebLLM] Web Gemini interaction error: {e}")
                    try:
                        browser.close()
                    except Exception:
                        pass
                    return ""
        except Exception as err:
            print(f"[GeminiWebLLM] Could not launch Playwright browser for Gemini Web: {err}")
            return ""

    def generate_json(self, prompt: str) -> any:
        """Sends prompt to Web Gemini and parses the returned JSON payload."""
        response_text = self.ask_gemini(prompt)
        if not response_text:
            return None
            
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            raw_json = json_match.group(1).strip()
        else:
            raw_json = response_text.strip()
            
        try:
            return json.loads(raw_json)
        except Exception as e:
            print(f"[GeminiWebLLM] Response was not valid JSON: {e}")
            return None
