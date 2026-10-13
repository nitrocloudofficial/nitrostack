# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Phase 6 - 2026-07-31

### Added
- **One-Click Demo Mode**: Automatically fills query, triggers workflow execution, animates graph, and transitions directly to the Workspace to demonstrate the full pipeline.
- **Table of Contents**: Added a sticky TOC sidebar to the Research Workspace for easy document navigation.
- **Graph MiniMap**: Added a MiniMap to the Knowledge Graph to help users navigate complex topologies.

### Changed
- **Dashboard**: Upgraded from skeleton placeholders to a premium control center with recent workflow mock data and glowing micro-interactions.
- **Performance**: Implemented `React.lazy` and `Suspense` across the frontend for optimal code-splitting and loading speeds.
- **Workflow Animations**: Nodes now pulse actively when running, and edges glow dynamically to visualize the directed execution sequence.
- **UI Polish**: Applied Framer Motion transitions, responsive adjustments, and unified typography across Landing, Dashboard, and Workspace.

### Fixed
- Re-architected frontend data bindings to ensure smooth automated transitions without race conditions.
- Strict Typescript resolutions across all components.
