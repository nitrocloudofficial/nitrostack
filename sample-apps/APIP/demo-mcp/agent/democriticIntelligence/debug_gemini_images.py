"""Quick diagnostic script to inspect Gemini's image generation UI."""
import os, sys, time, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

user_data_dir = os.path.abspath("gemini_user_data")
screenshots_dir = os.path.abspath("gemini_debug_screenshots")
os.makedirs(screenshots_dir, exist_ok=True)

print(f"[DEBUG] User data dir: {user_data_dir}")
print(f"[DEBUG] Screenshots dir: {screenshots_dir}")

with sync_playwright() as p:
    # Try to launch with persistent context
    browser = None
    for attempt in range(3):
        try:
            browser = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                args=["--disable-blink-features=AutomationControlled"]
            )
            print(f"[DEBUG] Browser launched on attempt {attempt+1}")
            break
        except Exception as e:
            print(f"[DEBUG] Attempt {attempt+1} failed: {e}")
            if attempt < 2:
                time.sleep(3)
            else:
                fallback = user_data_dir + f"_debug_{os.getpid()}"
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=fallback,
                    headless=False,
                    args=["--disable-blink-features=AutomationControlled"]
                )

    page = browser.new_page()
    
    # Step 1: Navigate to Gemini
    print("[DEBUG] Navigating to gemini.google.com...")
    page.goto("https://gemini.google.com/app", wait_until="load", timeout=45000)
    page.wait_for_timeout(3000)
    
    # Screenshot: Initial state
    page.screenshot(path=os.path.join(screenshots_dir, "01_initial_state.png"))
    print("[DEBUG] Screenshot 01: Initial state saved")
    
    # Check if logged in by looking for input box
    selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="prompt"]',
        'textarea',
        '.ql-editor',
        'rich-textarea',
        'input-area-v2'
    ]
    
    textbox = None
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                textbox = el
                print(f"[DEBUG] Found textbox with selector: {sel}")
                break
        except:
            pass
    
    if not textbox:
        print("[DEBUG] ERROR: No textbox found! User may not be logged in.")
        # Dump all visible elements for debugging
        page_info = page.evaluate("""() => {
            return {
                url: window.location.href,
                title: document.title,
                bodyText: document.body.innerText.substring(0, 500),
                inputElements: Array.from(document.querySelectorAll('input, textarea, [contenteditable], [role="textbox"]')).map(e => ({
                    tag: e.tagName,
                    type: e.type || '',
                    role: e.getAttribute('role') || '',
                    contentEditable: e.contentEditable,
                    visible: e.offsetParent !== null,
                    className: e.className.substring(0, 100)
                }))
            };
        }""")
        print(f"[DEBUG] Page URL: {page_info['url']}")
        print(f"[DEBUG] Page title: {page_info['title']}")
        print(f"[DEBUG] Body text: {page_info['bodyText'][:200]}")
        print(f"[DEBUG] Input elements found: {len(page_info['inputElements'])}")
        for el in page_info['inputElements']:
            print(f"  - {el}")
        
        with open(os.path.join(screenshots_dir, "page_info.json"), 'w') as f:
            json.dump(page_info, f, indent=2)
        
        browser.close()
        sys.exit(1)
    
    # Step 2: Submit image generation prompt
    prompt = "Generate an image of a futuristic space station control room with holographic displays and neon lighting"
    print(f"[DEBUG] Typing prompt: {prompt[:60]}...")
    
    textbox.focus()
    page.evaluate("""([el, val]) => { 
        el.textContent = val; 
        el.dispatchEvent(new Event('input', { bubbles: true })); 
    }""", [textbox, prompt])
    page.wait_for_timeout(500)
    
    # Screenshot: After typing
    page.screenshot(path=os.path.join(screenshots_dir, "02_after_typing.png"))
    print("[DEBUG] Screenshot 02: After typing saved")
    
    page.keyboard.press("Enter")
    print("[DEBUG] Prompt submitted! Waiting for response...")
    
    # Step 3: Wait and poll for response with progressive screenshots
    for check in range(60):
        page.wait_for_timeout(2000)
        
        if check in [5, 10, 15, 20, 25, 30, 40, 50]:
            page.screenshot(path=os.path.join(screenshots_dir, f"03_waiting_{check*2}s.png"))
            print(f"[DEBUG] Screenshot at {check*2}s saved")
        
        # Check for ALL img elements in the page
        img_report = page.evaluate("""() => {
            const allImgs = document.querySelectorAll('img');
            const report = [];
            for (const img of allImgs) {
                const rect = img.getBoundingClientRect();
                const src = img.src || '';
                report.push({
                    src: src.substring(0, 150),
                    width: img.naturalWidth || img.width || 0,
                    height: img.naturalHeight || img.height || 0,
                    alt: (img.alt || '').substring(0, 100),
                    className: (img.className || '').substring(0, 100),
                    parentClassName: (img.parentElement?.className || '').substring(0, 100),
                    grandParentClassName: (img.parentElement?.parentElement?.className || '').substring(0, 100),
                    rectWidth: Math.round(rect.width),
                    rectHeight: Math.round(rect.height),
                    visible: rect.width > 0 && rect.height > 0
                });
            }
            
            // Also check for canvas elements
            const canvases = document.querySelectorAll('canvas');
            const canvasReport = [];
            for (const c of canvases) {
                canvasReport.push({
                    width: c.width,
                    height: c.height,
                    className: (c.className || '').substring(0, 100)
                });
            }
            
            return { images: report, canvases: canvasReport, totalImgs: allImgs.length };
        }""")
        
        # Look for large images (likely generated)
        large_imgs = [img for img in img_report['images'] if img['width'] > 200 or img['rectWidth'] > 200]
        
        if large_imgs:
            print(f"[DEBUG] Found {len(large_imgs)} large image(s) at {check*2}s!")
            for i, img in enumerate(large_imgs):
                print(f"  Image {i}: {img['width']}x{img['height']} (rect: {img['rectWidth']}x{img['rectHeight']})")
                print(f"    src: {img['src']}")
                print(f"    alt: {img['alt']}")
                print(f"    class: {img['className']}")
                print(f"    parent class: {img['parentClassName']}")
                print(f"    grandparent class: {img['grandParentClassName']}")
            
            # Save final screenshot
            page.screenshot(path=os.path.join(screenshots_dir, "04_response_with_images.png"))
            
            # Save the full DOM structure around images
            dom_context = page.evaluate("""() => {
                const allImgs = document.querySelectorAll('img');
                const contexts = [];
                for (const img of allImgs) {
                    if ((img.naturalWidth || img.width) > 200 || img.getBoundingClientRect().width > 200) {
                        // Walk up 5 levels
                        let el = img;
                        let path = [];
                        for (let i = 0; i < 5 && el; i++) {
                            path.push({
                                tag: el.tagName,
                                id: el.id || '',
                                className: (el.className || '').substring(0, 200),
                                attributes: Array.from(el.attributes || []).map(a => `${a.name}="${a.value.substring(0, 50)}"`)
                            });
                            el = el.parentElement;
                        }
                        contexts.push({
                            src: (img.src || '').substring(0, 300),
                            alt: img.alt || '',
                            domPath: path
                        });
                    }
                }
                return contexts;
            }""")
            
            with open(os.path.join(screenshots_dir, "image_dom_context.json"), 'w') as f:
                json.dump(dom_context, f, indent=2)
            print("[DEBUG] DOM context saved to image_dom_context.json")
            
            break
        
        if check > 0 and check % 10 == 0:
            print(f"[DEBUG] {check*2}s: {img_report['totalImgs']} total imgs, {len(large_imgs)} large, {len(img_report['canvases'])} canvases")
    
    # Final screenshot regardless
    page.screenshot(path=os.path.join(screenshots_dir, "05_final_state.png"))
    print("[DEBUG] Screenshot 05: Final state saved")
    
    # Dump full report
    final_report = page.evaluate("""() => {
        const allImgs = document.querySelectorAll('img');
        return {
            url: window.location.href,
            totalImages: allImgs.length,
            images: Array.from(allImgs).map(img => ({
                src: (img.src || '').substring(0, 200),
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
                rectWidth: Math.round(img.getBoundingClientRect().width),
                rectHeight: Math.round(img.getBoundingClientRect().height),
                alt: (img.alt || '').substring(0, 100),
                className: (img.className || '').substring(0, 150),
                parentClass: (img.parentElement?.className || '').substring(0, 150)
            })),
            responseText: (document.querySelector('.model-response-text, .response-container, .message-content, .markdown')?.innerText || '').substring(0, 500)
        };
    }""")
    
    with open(os.path.join(screenshots_dir, "final_report.json"), 'w') as f:
        json.dump(final_report, f, indent=2)
    
    print(f"\n[DEBUG] === FINAL REPORT ===")
    print(f"  URL: {final_report['url']}")
    print(f"  Total images on page: {final_report['totalImages']}")
    print(f"  Response text preview: {final_report.get('responseText', 'N/A')[:200]}")
    print(f"  Images breakdown:")
    for img in final_report['images']:
        if img['rectWidth'] > 50:
            print(f"    - {img['rectWidth']}x{img['rectHeight']} src={img['src'][:80]} class={img['className'][:60]}")
    
    browser.close()
    print("\n[DEBUG] Done! Check gemini_debug_screenshots/ for all captures.")
