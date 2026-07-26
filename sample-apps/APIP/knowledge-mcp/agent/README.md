# Knowledge Graph Agent

Builds a product knowledge graph from Explorer Agent output.

It ingests pages, UI elements, forms, workflows, and relationships; supports
safe re-ingestion and page updates; and exposes query and publishing APIs for
documentation, QA, demo, and chat agents.

## Run

```bash
npm install
npm run build
npm test
npm start
```

The regression suite covers idempotent re-ingestion, navigation, form/API
relationships, workflow updates, page changes, validation, project isolation,
and published graph events.
