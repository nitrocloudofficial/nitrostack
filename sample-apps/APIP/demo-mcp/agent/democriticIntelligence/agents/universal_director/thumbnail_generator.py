import os
import sys
import time
import base64
import re
from playwright.sync_api import sync_playwright

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class ThumbnailGenerator:
    """Uses Web Gemini's image generation to create dynamic thumbnails.
    
    Flow:
    1. Opens Chromium → gemini.google.com (uses your logged-in Google account)
    2. Asks Gemini to GENERATE an image (thumbnail) for the topic
    3. Waits for Gemini to render the image
    4. Downloads the generated image from the page
    5. Saves it as a PNG thumbnail
    
    NOTHING is hardcoded — Gemini creates a unique image for each topic.
    """
    
    def __init__(self):
        self.user_data_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "gemini_user_data")
        )
    
    def generate(self, topic: str, app_name: str, headless: bool = False) -> str:
        """Ask Web Gemini to generate a thumbnail image for the given topic.
        
        Returns:
            Path to the saved thumbnail PNG file.
        """
        
        safe_topic = topic.lower().replace(" ", "-").replace("_", "-")
        output_file = f"{safe_topic}_thumbnail.png"
        
        print(f"[ThumbnailGenerator] Opening Chromium → gemini.google.com")
        print(f"[ThumbnailGenerator] Asking Gemini to CREATE thumbnail image for '{app_name}'...")
        
        prompt = self._build_prompt(topic, app_name)
        
        try:
            image_saved = self._ask_gemini_for_image(prompt, output_file, headless)
            
            if image_saved and os.path.exists(output_file):
                file_size = os.path.getsize(output_file)
                if file_size > 5000:  # At least 5KB for a real image
                    print(f"[ThumbnailGenerator] Thumbnail saved: {output_file} ({file_size / 1024:.1f} KB)")
                    return output_file
            
            # Retry with simpler prompt
            print("[ThumbnailGenerator] First attempt failed. Retrying with simpler prompt...")
            simple_prompt = f"Generate an image: A stunning, cinematic product launch thumbnail for '{app_name}', a {topic} app. Dark background, glowing neon accents, futuristic and premium."
            image_saved = self._ask_gemini_for_image(simple_prompt, output_file, headless)
            
            if image_saved and os.path.exists(output_file) and os.path.getsize(output_file) > 5000:
                print(f"[ThumbnailGenerator] Thumbnail saved on retry: {output_file}")
                return output_file
            
            # Fallback: screenshot the animation HTML at its hero moment
            print("[ThumbnailGenerator] Image generation unavailable. Using animation screenshot fallback...")
            return self._screenshot_fallback(topic, safe_topic, output_file, headless)
            
        except Exception as e:
            print(f"[ThumbnailGenerator] Error: {e}")
            return self._screenshot_fallback(topic, safe_topic, output_file, headless)
    
    def _build_prompt(self, topic: str, app_name: str) -> str:
        """Build a rich image generation prompt tailored to the topic."""
        
        return (
            f"Generate an image: Create a premium, cinematic product launch thumbnail for "
            f"'{app_name}', an innovative {topic} application. "
            f"Design requirements: "
            f"Dark gradient background (deep navy to black), "
            f"glowing neon accent lighting matching {topic} aesthetics, "
            f"sleek 3D glassmorphic UI mockup floating at an angle, "
            f"bold modern typography showing '{app_name}' as the hero text, "
            f"subtle particle effects and lens flares, "
            f"16:9 widescreen aspect ratio, "
            f"Apple keynote / Netflix launch quality. "
            f"Make it look like a $10,000 professional product launch visual."
        )
    
    def _ask_gemini_for_image(self, prompt: str, output_file: str, headless: bool) -> bool:
        """Send image generation prompt to Web Gemini and download the result."""
        
        try:
            with sync_playwright() as p:
                browser = None
                # Try persistent context with retry for profile lock
                for attempt in range(3):
                    try:
                        browser = p.chromium.launch_persistent_context(
                            user_data_dir=self.user_data_dir,
                            headless=headless,
                            args=["--disable-blink-features=AutomationControlled"]
                        )
                        break
                    except Exception:
                        if attempt < 2:
                            time.sleep(2.5)
                        else:
                            fallback_dir = self.user_data_dir + f"_thumb_{os.getpid()}"
                            browser = p.chromium.launch_persistent_context(
                                user_data_dir=fallback_dir,
                                headless=headless,
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
                        print("[ThumbnailGenerator] Textbox not found. User may not be logged in.")
                        browser.close()
                        return False
                    
                    # Type & submit prompt
                    textbox.focus()
                    page.evaluate("""([el, val]) => { 
                        el.textContent = val; 
                        el.dispatchEvent(new Event('input', { bubbles: true })); 
                    }""", [textbox, prompt])
                    page.wait_for_timeout(500)
                    page.keyboard.press("Enter")
                    
                    print("[ThumbnailGenerator] Image prompt submitted. Waiting for Gemini to generate image...")
                    
                    # Wait for image to appear in the response (Gemini image generation takes 15-45s)
                    image_found = False
                    for check in range(90):  # Up to 90 seconds
                        page.wait_for_timeout(1000)
                        
                        # Look for generated images in the response
                        image_data = page.evaluate("""() => {
                            // Look for images in the response area
                            const responseImages = document.querySelectorAll(
                                '.response-container img, ' +
                                '.message-content img, ' +
                                '.model-response-text img, ' +
                                '.generated-image img, ' +
                                'img[src*="blob:"], ' +
                                'img[src*="data:image"], ' +
                                'img[src*="googleusercontent"], ' +
                                'img[src*="lh3.google"]'
                            );
                            
                            for (const img of responseImages) {
                                const src = img.src || '';
                                const width = img.naturalWidth || img.width || 0;
                                // Filter out tiny icons and UI elements
                                if (width > 200 && (
                                    src.startsWith('blob:') || 
                                    src.startsWith('data:image') || 
                                    src.includes('googleusercontent') ||
                                    src.includes('lh3.google')
                                )) {
                                    return { src: src, width: width, height: img.naturalHeight || img.height || 0 };
                                }
                            }
                            
                            // Also check for canvas elements (some image generations use canvas)
                            const canvases = document.querySelectorAll('canvas');
                            for (const canvas of canvases) {
                                if (canvas.width > 200 && canvas.height > 200) {
                                    try {
                                        return { src: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
                                    } catch (e) {}
                                }
                            }
                            
                            return null;
                        }""")
                        
                        if image_data:
                            print(f"[ThumbnailGenerator] Image detected! ({image_data.get('width', '?')}x{image_data.get('height', '?')})")
                            image_found = True
                            
                            src = image_data.get('src', '')
                            
                            # Handle data: URI
                            if src.startswith('data:image'):
                                b64_match = re.search(r'base64,(.*)', src)
                                if b64_match:
                                    img_bytes = base64.b64decode(b64_match.group(1))
                                    with open(output_file, 'wb') as f:
                                        f.write(img_bytes)
                                    browser.close()
                                    return True
                            
                            # Handle blob: or remote URL — screenshot the image element
                            img_element = page.evaluate("""() => {
                                const imgs = document.querySelectorAll(
                                    '.response-container img, .message-content img, .model-response-text img, .generated-image img, img[src*="blob:"], img[src*="googleusercontent"], img[src*="lh3.google"]'
                                );
                                for (const img of imgs) {
                                    if ((img.naturalWidth || img.width) > 200) {
                                        const rect = img.getBoundingClientRect();
                                        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                                    }
                                }
                                return null;
                            }""")
                            
                            if img_element:
                                # Screenshot just the image element
                                page.screenshot(
                                    path=output_file,
                                    clip={
                                        "x": max(0, img_element["x"]),
                                        "y": max(0, img_element["y"]),
                                        "width": img_element["width"],
                                        "height": img_element["height"]
                                    }
                                )
                                browser.close()
                                return True
                            
                            break
                        
                        # Progress indicator every 10 seconds
                        if check > 0 and check % 10 == 0:
                            print(f"[ThumbnailGenerator] Still waiting for image... ({check}s)")
                    
                    if not image_found:
                        print("[ThumbnailGenerator] No generated image detected in Gemini response.")
                    
                    browser.close()
                    return image_found
                    
                except Exception as e:
                    print(f"[ThumbnailGenerator] Browser interaction error: {e}")
                    try:
                        browser.close()
                    except Exception:
                        pass
                    return False
                    
        except Exception as err:
            print(f"[ThumbnailGenerator] Could not launch browser: {err}")
            return False
    
    def _screenshot_fallback(self, topic: str, safe_topic: str, output_file: str, headless: bool) -> str:
        """Fallback: screenshot the generated animation HTML at its hero moment."""
        
        animation_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "animation")
        )
        html_path = os.path.join(animation_dir, f"{safe_topic}.html")
        
        if not os.path.exists(html_path):
            print(f"[ThumbnailGenerator] No animation HTML found at {html_path}")
            return ""
        
        print(f"[ThumbnailGenerator] Screenshotting animation at hero moment (2s)...")
        
        file_url = f"file:///{os.path.abspath(html_path).replace(chr(92), '/')}"
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    device_scale_factor=2
                )
                page = context.new_page()
                page.goto(file_url, wait_until="load")
                
                # Wait 2 seconds for the hero scene to render
                page.wait_for_timeout(2000)
                
                page.screenshot(path=output_file, full_page=False)
                
                context.close()
                browser.close()
                
            if os.path.exists(output_file) and os.path.getsize(output_file) > 5000:
                print(f"[ThumbnailGenerator] Screenshot thumbnail saved: {output_file}")
                return output_file
                
        except Exception as e:
            print(f"[ThumbnailGenerator] Screenshot fallback error: {e}")
        
        return ""
