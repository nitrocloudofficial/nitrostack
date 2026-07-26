import sys
import os
import time
from playwright.sync_api import sync_playwright

def main():
    print("==================================================")
    print(" OPENING SIGNED-IN CHROMIUM BROWSER WINDOW       ")
    print(" Navigating to https://gemini.google.com/app      ")
    print("==================================================\n")

    user_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "universal-director-agent", "democriticIntelligence", "gemini_user_data"))

    with sync_playwright() as p:
        # Launch visible browser using user profile
        browser = p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            viewport={"width": 1400, "height": 900},
            args=["--disable-blink-features=AutomationControlled"]
        )

        page = browser.new_page()
        page.goto("https://gemini.google.com/app", wait_until="domcontentloaded")
        print("-> Chromium window is open on your screen.")
        print("-> Waiting 15 seconds for signed-in session...")
        page.wait_for_timeout(15000)

        # Check for prompt input box
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
            print("[NOTICE] Please log into your Google Account in the open Chromium browser window!")
            print("Holding browser open for 60 seconds so you can sign in...")
            page.wait_for_timeout(60000)
            browser.close()
            return

        prompt = """Write a MASSIVE 1000+ line self-contained HTML (with CSS and JS) for a 25s 3D product launch video for "Royal Challengers Bengaluru (RCB)". 
Include: 3D phone frame, Dynamic Island, Siri-Gemini morph orb, and visible broadcast subtitles bar. Return ONLY HTML code."""

        print("-> Typing prompt into signed-in Gemini Web LLM...")
        textbox.focus()
        page.evaluate("""([el, val]) => { 
            el.textContent = val; 
            el.dispatchEvent(new Event('input', { bubbles: true })); 
        }""", [textbox, prompt])
        page.wait_for_timeout(1000)
        page.keyboard.press("Enter")

        print("-> Prompt submitted! Streaming response from Signed-In Gemini...")
        
        last_text = ""
        stable_count = 0
        for _ in range(90):
            page.wait_for_timeout(1000)
            current_text = page.evaluate("""() => {
                const sel = ['.message-content', '.markdown', 'div.markdown', '.response-content'];
                for (const s of sel) {
                    const els = document.querySelectorAll(s);
                    if (els.length > 0) return els[els.length - 1].innerText;
                }
                return '';
            }""")
            if current_text and current_text == last_text and len(current_text) > 10:
                stable_count += 1
                if '</html>' in current_text.lower() or stable_count >= 5:
                    break
            else:
                stable_count = 0
                last_text = current_text

        print(f"-> Received AI response ({len(last_text)} chars) from Signed-In Gemini!")
        
        out_file = os.path.abspath("signed_gemini_response.html")
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(last_text)

        print(f"Saved to: {out_file}")
        browser.close()

if __name__ == "__main__":
    main()
