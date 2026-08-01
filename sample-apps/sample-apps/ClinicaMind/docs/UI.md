# UI.md

**Purpose:** Specify the ClinicaMind frontend design, focusing on the interactive node canvas and accessibility.

## Canvas Overview

ClinicaMind uses an interactive canvas instead of a chat interface. Nodes represent agents and findings, and arrows show the workflow between them.

## React Flow Setup

We recommend using **React Flow** for the graph visualization.

### Node Types

- `HistoryNode`
- `MedicationNode`
- `ResearchNode`
- `WarningNode`
- `SummaryNode`
- `GapNode`
- `SupervisorNode`

### Node Properties

Each node should include:
- `id`: string
- `type`: string
- `position`: `{ x: number, y: number }`
- `data`: custom object with `title`, `content`, and optional details
- `ariaRole`: string for accessibility

Example:

```ts
const nodes = [
  {
    id: '1',
    type: 'history',
    position: { x: 50, y: 100 },
    data: { title: 'History', content: 'Diabetes, No allergies' },
    ariaRole: 'region'
  },
  {
    id: '2',
    type: 'medication',
    position: { x: 300, y: 100 },
    data: { title: 'Medications', content: 'Warfarin, Ibuprofen' }
  }
];
```

### Edges

Edges connect source and target nodes.
- `source`: node id
- `target`: node id
- `label`: optional descriptive text

Example:

```ts
const edges = [
  { id: 'e1-2', source: '1', target: '2', label: 'evaluates' }
];
```

### Custom Nodes

Build custom React components for each node type.

```jsx
function InfoNode({ data }) {
  return (
    <div className="info-node" aria-label={data.title} role="region">
      <strong>{data.title}</strong>
      <div>{data.content}</div>
    </div>
  );
}
const nodeTypes = {
  history: InfoNode,
  medication: InfoNode,
  warning: InfoNode,
};
```

### Animations and Updates

- Use fade-in or color highlights when new nodes arrive.
- Warning nodes can blink or use a red ring for high severity.
- Animate graph updates to make the flow feel live.

## Interactivity

- Nodes are draggable and selectable.
- Tooltips or popovers show research abstracts and detailed findings.
- Include an activity log sidebar listing recent agent actions.

## Accessibility

- Use `nodesFocusable={true}` and `edgesFocusable={true}`.
- Provide `aria-label` for each node.
- Use semantic roles: `role="region"` for nodes, `role="alert"` for warnings.
- Ensure keyboard navigation through React Flow.

Example:

```jsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  nodesFocusable={true}
  edgesFocusable={true}
/>
```

## Responsive Design

- The canvas should resize with the browser and support zoom/pan controls.
- Place a sidebar on wider screens for findings and agent activity.

## UI Skeleton

- **Header**: Project title, `Start Consultation`, `Demo Case` buttons.
- **Canvas area**: React Flow graph.
- **Sidebar**: Agent output summary, transcript, alerts.
- **Status bar**: Listening indicator and session state.

This UI spec guides the frontend implementation and keeps ClinicaMind’s workflow visible and actionable.
