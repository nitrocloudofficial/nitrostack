# PharmaGuard Widget

A comprehensive React widget for displaying FDA drug safety information, including NDC details, adverse events, and recall status.

## Overview

The PharmaGuard widget visualizes data from three FDA tools:
- **`lookup_ndc`** — Drug name, NDC code, manufacturer, dosage form
- **`search_adverse_events`** — Top 5 adverse reactions with frequency counts
- **`check_recall_status`** — Active recalls and enforcement actions

## Architecture

### Files

| File | Purpose |
|------|---------|
| `PharmaGuardWidget.tsx` | Main React component; renders header, status badge, and charts |
| `types.ts` | TypeScript interfaces for payload shape |
| `normalizer.ts` | Converts tool outputs into unified payload format |
| `example.tsx` | Demo component showing integration pattern |

### Data Flow

```
FDA Tools (fda.tools.ts)
    ↓
Tool Outputs (NdcToolOutput, AdverseEventsToolOutput, RecallStatusToolOutput)
    ↓
normalizePharmaGuardData() [normalizer.ts]
    ↓
PharmaGuardPayload (types.ts)
    ↓
<PharmaGuardWidget payload={data} />
```

## Component Structure

### 1. **Header Card**
- Drug name (cyan accent)
- NDC code (monospace)
- Manufacturer (emerald accent)
- Dosage form (optional)

### 2. **Status Badge**
- **Green banner** if no active recalls: "✓ No Active Recalls"
- **Red alert box** if recalls exist: Lists classification, reason, and status

### 3. **Donut Chart (PieChart)**
- Top 6 adverse reactions by frequency
- Custom tooltip showing reaction name, count, and percentage
- Color palette: cyan, rose, emerald, amber, violet

### 4. **Bar Chart**
- X-axis: Reaction types (top 6)
- Y-axis: Event count
- Hover tooltips with exact counts
- Gradient fill (cyan)

## Theme

Dark theme with modern accents:

```typescript
const THEME = {
  bg: {
    surface: '#0f172a',      // Main background
    card: '#1e293b',         // Card background
    hover: '#334155',        // Hover state
  },
  text: {
    primary: '#f1f5f9',      // Primary text
    secondary: '#cbd5e1',    // Secondary text
    muted: '#94a3b8',        // Muted text
  },
  accent: {
    cyan: '#22d3ee',         // Primary accent
    emerald: '#34d399',      // Success/positive
    rose: '#fb7185',         // Alert/negative
    amber: '#fbbf24',        // Warning
    violet: '#c084fc',       // Secondary accent
  },
};
```

## Usage

### Basic Integration

```typescript
import { PharmaGuardWidget } from './widgets/PharmaGuardWidget.js';
import { normalizePharmaGuardData } from './widgets/normalizer.js';

// After calling the three FDA tools:
const payload = normalizePharmaGuardData(
  ndcOutput,
  adverseEventsOutput,
  recallStatusOutput,
);

// Render the widget
<PharmaGuardWidget payload={payload} />
```

### With Tool Binding

The widget is already bound to all three tools via `@Widget('pharmaguard-widget')` decorator in `fda.tools.ts`. When any tool is called, the widget will automatically render with the tool's output.

### Partial Data

The widget gracefully handles partial data:

```typescript
// Only NDC data available
const payload = normalizePharmaGuardData(ndcOutput);
// Widget renders header card, empty adverse events section

// Only adverse events available
const payload = normalizePharmaGuardData(undefined, adverseEventsOutput);
// Widget renders charts, default drug info
```

## Type Definitions

### `PharmaGuardPayload`

```typescript
interface PharmaGuardPayload {
  drug: DrugInfo;
  adverseEvents: AdverseReaction[];
  recalls: Recall[];
  loading?: boolean;
  error?: string | null;
}
```

### `DrugInfo`

```typescript
interface DrugInfo {
  name: string;
  ndc: string;
  manufacturer: string;
  dosageForm?: string;
}
```

### `AdverseReaction`

```typescript
interface AdverseReaction {
  reaction: string;
  count: number;
}
```

### `Recall`

```typescript
interface Recall {
  classification: string;
  reason: string;
  status: string;
  initiationDate: string;
}
```

## Customization

### Modify Theme

Edit `THEME` object in `PharmaGuardWidget.tsx`:

```typescript
const THEME = {
  bg: { surface: '#your-color', ... },
  accent: { cyan: '#your-color', ... },
  // ...
};
```

### Adjust Chart Colors

Modify `CHART_COLORS` array:

```typescript
const CHART_COLORS = [
  '#your-color-1',
  '#your-color-2',
  // ...
];
```

### Change Chart Dimensions

Update `ResponsiveContainer` height in `DonutChart` and `EventCountBarChart`:

```typescript
<ResponsiveContainer width="100%" height={300}>
  {/* ... */}
</ResponsiveContainer>
```

## Dependencies

- **React** — UI framework
- **recharts** — Chart library (PieChart, BarChart, etc.)
- **@nitrostack/core** — Widget decorator and types

## Testing

### Mock Data Example

```typescript
const mockPayload: PharmaGuardPayload = {
  drug: {
    name: 'Aspirin',
    ndc: '0069-0001-01',
    manufacturer: 'Bayer AG',
    dosageForm: 'Tablet',
  },
  adverseEvents: [
    { reaction: 'Nausea', count: 1250 },
    { reaction: 'Headache', count: 980 },
    { reaction: 'Dizziness', count: 750 },
  ],
  recalls: [],
};

<PharmaGuardWidget payload={mockPayload} />
```

### With Recalls

```typescript
const mockPayloadWithRecalls: PharmaGuardPayload = {
  // ... drug and adverseEvents ...
  recalls: [
    {
      classification: 'Class II',
      reason: 'Contamination',
      status: 'Active',
      initiationDate: '2024-01-15',
    },
  ],
};
```

## Accessibility

- All text uses semantic HTML (`<h2>`, `<p>`, etc.)
- Color contrast meets WCAG AA standards
- Chart tooltips provide text alternatives to visual data
- No reliance on color alone for information (e.g., status badge includes text + icon)

## Performance

- Charts use `ResponsiveContainer` for responsive sizing
- Donut chart limited to top 6 reactions (aggregates remainder as "Other")
- Bar chart limited to top 6 reactions for readability
- No unnecessary re-renders (React.FC with memoization-ready structure)

## Future Enhancements

- [ ] Export chart data as CSV/PDF
- [ ] Timeline view for adverse events over time
- [ ] Comparison with similar drugs
- [ ] Interactive filtering by reaction severity
- [ ] Dark/light theme toggle
- [ ] Accessibility audit (WCAG AAA)

## License

Part of the PharmaGuard MCP project.
