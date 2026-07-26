Below is the **updated MCP Brand Guidelines (AI-Executable Specification)** aligned strictly with the attached PDF:

> Source: *MCP Brand Guidelines – New.pdf* 
> All values below now reflect the official document.

---

# MCP Brand Guidelines (AI-Executable Specification — Updated)

> Authoritative source: MCP Brand Guidelines – Wekan Enterprise Solutions 
> Overrides all previous token definitions.

---

# 0. Global Enforcement Rules

* DO NOT invent colors
* DO NOT rename tokens
* DO NOT alter type scale
* DO NOT modify shadow opacity values
* DO NOT alter border radii
* Dark mode parity is mandatory
* Use tokens only (no raw values in UI code)

---

# 1. Typography System

## 1.1 Font Families

```
Heading Font: Space Grotesk
Body Font: IBM Plex Sans
```

Both must load from Google Fonts.

---

## 1.2 Immutable Type Scale

| Token   | Font          | Size | Line Height | Weight   |
| ------- | ------------- | ---- | ----------- | -------- |
| H1      | Space Grotesk | 48px | 125%        | Bold     |
| H2      | Space Grotesk | 36px | 130%        | SemiBold |
| H3      | Space Grotesk | 28px | 135%        | Medium   |
| H4      | IBM Plex Sans | 16px | 150%        | Medium   |
| Body    | IBM Plex Sans | 16px | 150%        | Regular  |
| Body-sm | IBM Plex Sans | 14px | 140%        | Regular  |
| Caption | IBM Plex Sans | 12px | 135%        | Regular  |

(Sourced from Typography section, pages 2–3 )

---

# 2. Brand Core Colors (Updated)

```
slateInk: "#121217"
signalBlue: "#187CF4"
skyBlue: "#05A3FD"
```

(Replaces previous coolMint core usage — now moved to status only) 

---

# 3. Extended Palette — Light Mode

```yaml
background:
  canvas: "#F5F6FA"   # Cloud Canvas
  white: "#FFFFFF"

text:
  primary: "#121217"
  secondary: "#5F6475"

border:
  soft: "#E6E8F0"
  subtle: "#EEF0F6"
  disabled: "#D1D5E0"

status:
  success: "#2AB5A5"   # Success Mint
  warning: "#F59E0B"   # Warm Amber
  error: "#EF4444"     # Dark Flame
  info: "#0284C7"      # Deep Cerulean

accent:
  electricIndigo: "#5C5CFF"
```

(Source pages 6–8 )

---

# 4. Extended Palette — Dark Mode

```yaml
background:
  base: "#0E0F14"        # Obsidian Base
  surface: "#1B1B20"     # Layered Charcoal

text:
  primary: "#E9E9F0"     # Ink White
  muted: "#B4B4CC"

border:
  panel: "#312626"
  subtle: "#292930"
  disabled: "#1B1B20"

status:
  success: "#2AB5A5"
  warning: "#F59E0B"
  error: "#EF4444"
  info: "#3ABEF9"        # Info Cerulean

accent:
  vividProton: "#7B61FF"
```

(Source pages 9–11 )

---

# 5. Gradients (Updated)

## 5.1 Surface Depth

```css
linear-gradient(180deg, #FFFFFF 0%, #F5F6FA 100%)
```

Usage: Cards, modals, panels (Light + Dark per PDF) 

---

## 5.2 Secondary Action

```css
linear-gradient(135deg, #187CF4 0%, #05A3FD 100%)
```

Opacity support:

* Light mode: 20%–40%
* Dark mode: 40%–80%

---

## 5.3 Radial Focus Glow

### Light Mode

```css
radial-gradient(circle, #187CF4 0%, #F5F6FA 70%, #FFFFFF 100%)
```

### Dark Mode

```css
radial-gradient(circle, #187CF4 0%, #121217 70%, #26262C 100%)
```

(Source pages 12–13 )

---

# 6. Borders & Radius (Verified)

```
Default Radius: 4px
Pill Radius: 999px
Circle: 50%
```

## Border States

| State    | Width | Color Token                               |
| -------- | ----- | ----------------------------------------- |
| Default  | 1px   | border.soft (light) / border.panel (dark) |
| Subtle   | 1px   | border.subtle                             |
| Focus    | 2px   | #187CF4 (dark) / #5F5FFF (light)          |
| Accent   | 1px   | #2AB5A5 or #05A3FD (mode dependent)       |
| Disabled | 1px   | border.disabled                           |

(Source page 15 )

---

# 7. Shadows & Elevation (Corrected Values)

## Light Mode

```
Low:    0px 1px 3px rgba(240,100,49,0.08)
Medium: 0px 4px 12px rgba(240,100,49,0.11)
High:   0px 8px 28px rgba(240,100,49,0.14)
Focus:  0px 0px 28px rgba(173,62,44,0.30)
```

## Dark Mode

```
Low:    0px 1px 3px rgba(0,0,0,0.07)
Medium: 0px 4px 12px rgba(0,0,0,0.10)
High:   0px 8px 28px rgba(0,0,0,0.15)
Focus:  0px 0px 28px rgba(217,91,60,0.16)
```

(Verified from page 16 visual reference )

---

# 8. Buttons (Updated Behavioral Rules)

Types:

* Primary
* Secondary
* Outlined

States:

```
default → hover → focus → active → disabled
```

Rules:

* Focus must use 2px ring
* Disabled removes shadow
* Secondary uses Sky Blue
* Primary uses Signal Blue
* No color drift allowed

(Source pages 18–19 )

---

# 9. Badges & Tags (Confirmed)

```
Radius: 999px
Padding: 6px / 12px
```

Types:

* Primary
* Secondary
* Success
* Warning
* Error
* Information

Optional:

* Mint glow (success)
* Blue glow (focus)

(Source page 20 )

---

# 10. Icon System (Expanded Rules)

Icon Pack:

```
Material Symbols (Outlined only)
```

Material Symbol Settings:

```
Fill: 0 (Outlined default)
Weight: 200
Grade: 0
Optical Size: Match render size
```

Filled Variant Allowed Only For:

* Active navigation
* Primary toggle ON
* High-confidence success confirmation (rare)

Icon Colors:

Light Mode:

* Primary: #121217
* Secondary: #5F6475
* Disabled: #A1A6B5
* Info: #0A9CA9

Dark Mode:

* Primary: #E9E9F0
* Secondary: #B4B4CC
* Disabled: #5A5A6A

(Source pages 21–22 )

---

# 11. AI Migration Checklist (Revised)

When refactoring:

1. Replace core colors (remove coolMint as primary)
2. Normalize gradients
3. Enforce focus ring tokens
4. Add active state to buttons
5. Update dark mode border palette
6. Update icon weights to 200
7. Add disabled border tokens
8. Ensure skyBlue usage for secondary actions