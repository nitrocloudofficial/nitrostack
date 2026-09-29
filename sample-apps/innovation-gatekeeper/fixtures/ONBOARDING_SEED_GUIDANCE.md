# Seed & widget images

When you add fixtures or in-memory mock data for this app:

1. **Every list/card entity** needs a stable `imageUrl` (HTTPS). Get it from the `agent-search-image` tool (e.g. `agent-search-image` with query `"margherita pizza"`) and use the returned `url` field directly — never hand-write or guess an Unsplash photo URL/id, guessed ones 404 in the running app.
2. Use **domain-appropriate** search queries (menus for restaurants, products for shops, people/places for booking apps).
3. **Widgets** must render those URLs with `aspect-square` or `aspect-video`, `object-cover`, and a text/icon fallback — never text-only cards when data includes images.
4. Prefer `fixtures/*.json` plus tools that load them; keep 8–12 rich seed rows for demos.
