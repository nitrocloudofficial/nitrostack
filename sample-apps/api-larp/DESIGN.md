# Design System — API Impact Summary Widget

## Visual World: Clinical Precision

Light, clean, documentation-style interface where severity is the primary visual signal. Dense but scannable information display. Monospace for code paths, sans-serif for labels. Minimal chrome — borders only where they create hierarchy.

## Color Tokens (Final)

### Backgrounds
- `--bg-widget: #ffffff`
- `--bg-surface: #f8f9fb`
- `--bg-elevated: #ffffff`

### Borders
- `--border-default: #eaecf0`
- `--border-subtle: #e4e7ec`
- `--border-input: #d0d5dd`

### Text
- `--text-primary: #101828`
- `--text-secondary: #475467`
- `--text-tertiary: #667085`
- `--text-disabled: #98a2b3`
- `--text-on-dark: #ffffff`

### Severity
- `--severity-high: #b42318`
- `--severity-medium: #b54708`
- `--severity-low: #067647`

### Semantic
- `--color-breaking: #d92d20`
- `--color-nonbreaking: #12b76a`
- `--color-impact-bg: #fef3f2`
- `--color-impact-text: #b42318`
- `--color-safe-bg: #f0fdf4`
- `--color-safe-text: #067647`
- `--color-decision-bg: #ecfdf3`
- `--color-decision-border: #a6f4c5`
- `--color-decision-text: #067647`
- `--color-error-bg: #fef3f2`
- `--color-error-border: #fecdca`
- `--color-error-text: #b42318`
- `--color-banner-bg: #fffaeb`
- `--color-banner-border: #f79009`
- `--color-banner-text: #b54708`

### Actions
- `--action-primary: #067647`
- `--action-danger: #b42318`
- `--action-disabled-bg: #f2f4f7`

## Typography (Final)

### Family
- Primary: Inter, system-ui, sans-serif
- Monospace: ui-monospace, SFMono-Regular, Consolas, monospace

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| caption | 11px (0.6875rem) | 700 | Badge text, stat labels |
| body-xs | 12px (0.75rem) | 400 | Path text, hints, banner |
| body-sm | 13px (0.8125rem) | 400 | Secondary content, rationale |
| body | 14px (0.875rem) | 400 | Widget default |
| heading-sm | 14px (0.875rem) | 600 | Section titles, labels |
| heading | 20px (1.25rem) | 600 | Main title |
| display | 24px (1.5rem) | 800 | Reserved for future |

## Spacing (Final)

| Token | Value | Use |
|-------|-------|-----|
| tight | 8px | Card gaps, inner spacing |
| default | 12px | Grid gaps, card padding |
| comfortable | 14px | Card padding, section spacing |
| section | 20px | Section separator padding |
| gap | 24px | Stats grid margin-top |
| section-gap | 28px | Section margin-top |
| widget-pad | 24px | Widget padding |

## Borders & Radii (Final)

| Token | Value | Use |
|-------|-------|-----|
| radius-card | 10px | Widget container |
| radius-section | 8px | Cards, buttons, inputs, stat boxes |
| radius-badge | 999px | Severity badge (pill) |
| radius-change | 6px | Change cards |
| radius-classification | 4px | Classification badges |
| border-widget | 1px solid #e4e7ec | Widget container |
| border-card | 1px solid #eaecf0 | Stat boxes, evidence cards |
| border-input | 1px solid #d0d5dd | Textarea, fallback button |

## Shadows (Final)

- Widget: `0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,40,.06)`

## Motion (Final)

- Button transition: `background 150ms ease-out, opacity 150ms ease-out`
- No page-load animations
- No orchestrated sequences

## Component Patterns (Final)

### Severity Badge
- Pill shape, full color background, white text
- Font-weight 800, uppercase, letter-spacing 0.02em

### Stats Grid
- 3-column desktop, 1-column mobile (responsive)
- Light surface background with subtle border
- Uppercase label (11px, weight 600) + value (13px, weight 600)

### Change Cards
- Left border accent (3px): red for breaking, green for non-breaking
- Light surface background
- Code in monospace (12px, weight 600)

### Evidence Cards
- Subtle border, rounded corners
- Repository name bold (13px, weight 600)
- Classification badge: colored background + text based on IMPACT

### Actions Bar
- Separated by border-top
- Primary action (Approve) left, danger action (Block) right
- Disabled state: reduced opacity, cursor not-allowed

### Error State
- Inline block with red background/border
- Descriptive text + recovery action

## Anti-patterns Avoided

- No gradient text
- No glass/blur effects
- No section numbers (01/02/03)
- No tracked uppercase eyebrows everywhere (only main title)
- No sparklines or progress rings
- No decorative motion
- No modals for decision actions
- No card scaffolds with icon + heading + text
- No hero-metric template
