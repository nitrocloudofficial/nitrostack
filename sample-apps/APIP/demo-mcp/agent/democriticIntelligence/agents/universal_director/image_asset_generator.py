import os
import sys
import re
from .thumbnail_generator import ThumbnailGenerator

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class ImageAssetGenerator:
    """Generates AI Product Assets for HTML Animations via Web Gemini / Playwright.
    
    This ensures that every product showcase, shoe launch, or tech feature in the video 
    uses real AI-generated visual assets instead of plain SVGs or static placeholders.
    """
    
    def __init__(self):
        self.thumbnail_gen = ThumbnailGenerator()
        self.animation_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "animation")
        )

    def generate_assets_for_html(self, html_path: str, topic: str, research_brief: str = None) -> str:
        """Parses the generated HTML file, creates AI images for placeholders, and returns updated HTML."""
        
        if not os.path.exists(html_path):
            print(f"[ImageAssetGenerator] HTML file not found: {html_path}")
            return html_path

        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        safe_topic = topic.lower().replace(" ", "-").replace("_", "-")
        
        # Identify missing or placeholder image references
        img_matches = re.findall(r'src=["\']([^"\']+\.(?:png|jpg|jpeg|webp))["\']', html_content, re.IGNORECASE)
        
        assets_to_generate = []
        for img_src in img_matches:
            if not img_src.startswith("http") and not img_src.startswith("data:"):
                assets_to_generate.append(img_src)
                
        # Always ensure at least 1 hero asset exists for the topic
        hero_filename = f"{safe_topic}_hero.png"
        if not assets_to_generate:
            assets_to_generate.append(hero_filename)

        print(f"[ImageAssetGenerator] Found {len(assets_to_generate)} image assets to generate for '{topic}'...")
        
        generated_map = {}
        for idx, asset_name in enumerate(assets_to_generate[:3]):  # Limit to 3 key assets for speed
            asset_path = os.path.join(self.animation_dir, asset_name)
            
            # Skip if asset already exists and is valid
            if os.path.exists(asset_path) and os.path.getsize(asset_path) > 10000:
                print(f"  [OK] Asset already present: {asset_name}")
                generated_map[asset_name] = asset_name
                continue

            print(f"  [Generating] AI Product Asset {idx+1}: {asset_name} for '{topic}'...")
            
            # Construct bespoke prompt for asset
            if idx == 0:
                prompt = (
                    f"Generate an image: A photorealistic ultra-detailed 3D product hero shot of {topic}, "
                    f"floating at a dynamic 3/4 perspective angle. Dark studio background with vibrant rim lighting, "
                    f"glassmorphic reflections, premium metallic and polymer textures, 8k resolution, product photography."
                )
            elif idx == 1:
                prompt = (
                    f"Generate an image: Macro close-up photography of {topic} material texture and technology breakdown node. "
                    f"Cinematic lighting, dark atmospheric studio, ultra-high detail."
                )
            else:
                prompt = (
                    f"Generate an image: Side profile hero shot of {topic} with glowing energy aura and metallic accents. "
                    f"Dark gradient background, 8k resolution."
                )

            # Use ThumbnailGenerator engine to request Gemini image
            saved_file = self.thumbnail_gen.generate(
                topic=topic,
                app_name=f"{topic} Asset {idx+1}"
            )
            
            if saved_file and os.path.exists(saved_file):
                import shutil
                shutil.copy(saved_file, asset_path)
                generated_map[asset_name] = asset_name
                print(f"  [OK] AI Image Generated & Copied -> {asset_name}")
            else:
                print(f"  [Fallback] Could not generate AI asset for {asset_name}")

        # Inject/enhance HTML with generated assets and 3D motion CSS
        updated_html = self._inject_assets_into_html(html_content, generated_map, safe_topic)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(updated_html)

        print(f"[ImageAssetGenerator] Successfully updated HTML with AI visual assets: {html_path}")
        return html_path

    def _inject_assets_into_html(self, html: str, asset_map: dict, safe_topic: str) -> str:
        """Ensures HTML includes proper CSS 3D float/glow animations for generated images."""
        
        # If hero asset exists, ensure hero containers use the image
        hero_asset = f"{safe_topic}_hero.png"
        if os.path.exists(os.path.join(self.animation_dir, hero_asset)):
            # Replace placeholder SVGs or empty model containers with hero image if present
            hero_replacement = (
                f'<img src="{hero_asset}" alt="{safe_topic}" class="ai-hero-img" '
                f'style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 20px 40px rgba(255,102,0,0.4)); animation: floatHero 4s ease-in-out infinite, pulseGlow 3s ease-in-out infinite;">'
            )
            
            # Replace svg shoe/product containers if they exist
            html = re.sub(r'<svg class="shoe-svg"[^>]*>[\s\S]*?</svg>', hero_replacement, html)
            html = re.sub(r'<div class="product-placeholder"[^>]*>[\s\S]*?</div>', hero_replacement, html)

        # Inject CSS keyframes for AI Image motion if not present
        if '@keyframes floatHero' not in html:
            motion_css = """
        /* AI Image Asset Motion & Parallax Effects */
        .ai-hero-img {
            transform-style: preserve-3d;
            transition: transform 0.5s ease-out;
        }
        @keyframes floatHero {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-18px) rotate(-3deg) scale(1.03); }
        }
        @keyframes pulseGlow {
            0%, 100% { filter: drop-shadow(0 15px 30px rgba(255,102,0,0.3)); }
            50% { filter: drop-shadow(0 25px 50px rgba(255,102,0,0.6)); }
        }
            """
            html = html.replace("</style>", f"{motion_css}\n</style>")

        return html
