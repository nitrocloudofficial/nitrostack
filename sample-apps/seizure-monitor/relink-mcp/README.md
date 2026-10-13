# ReLink

> One factory's waste is another factory's raw material — connected by AI.

An AI-powered B2B marketplace for industrial surplus and waste materials. Sellers list surplus stock using AI-assisted photo recognition; buyers discover matching sellers through a natural-language, MCP-powered agent and a map-based interface.

Built for the **Manufacturing & Industry 4.0** track.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Capacity-Sharing](#capacity-sharing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Factories generate large volumes of reusable industrial waste — metal scrap, plastic offcuts, textile remnants — every month. Much of it is sold to middlemen below fair value, while buyers pay heavy markups for the same material. ReLink removes the middleman by directly connecting sellers and buyers using AI-assisted listings and agentic search.

## Features

- **AI-Assisted Listing Creation** — Upload a photo of surplus material; the Gemini Vision API auto-populates product name, quantity, quality score (1–10), and suggested price. All fields are editable before publishing.
- **Company Registration with Geolocation** — Companies register with their business details and location, enabling location-based discovery.
- **Natural-Language Buyer Search** — Buyers describe what they need (e.g. *"aluminum scrap under ₹150/kg near me"*) instead of using manual filters.
- **MCP-Powered Agent Layer** — Listing creation, search, and matching are exposed as MCP tools, so the agent layer can be extended to other systems (ERP, logistics, payments).
- **Map-Based Discovery** — Matching sellers are displayed on a map relative to the buyer's location.
- **Capacity-Sharing Requests** — Companies can post unfulfilled production capacity as a buyer-side request within the same listing system (see [Capacity-Sharing](#capacity-sharing) below).

## Tech Stack

| Layer | Technology |
|---|---|
| Vision / Classification | Gemini Vision API |
| Agent / Tooling | MCP (Model Context Protocol) |
| Backend | _fill in framework, e.g. Node.js / FastAPI_ |
| Database | _fill in, e.g. PostgreSQL / Supabase_ |
| Frontend | _fill in, e.g. React / React Native_ |
| Maps | _fill in, e.g. Google Maps API / Mapbox_ |

## Architecture

```
Seller App ──▶ Gemini Vision API ──▶ Listing MCP Server ──▶ Listings Database
                                                                   │
Buyer App ──▶ Sourcing Agent (LLM) ──▶ Sourcing MCP Server ◀──────┘
                                              │
                                              ▼
                                      Map-based results
```

## Getting Started

### Prerequisites

- Node.js >= 18 _(adjust to your actual stack)_
- A Gemini API key
- Database instance (e.g. PostgreSQL / Supabase)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/relink.git
cd relink

# Install dependencies
npm install

# Copy environment file and fill in your keys
cp .env.example .env
```

### Running Locally

```bash
npm run dev
```

The app should now be running at `http://localhost:3000` _(adjust as needed)_.

## Environment Variables

Create a `.env` file in the root directory with the following:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_database_connection_string
MAPS_API_KEY=your_maps_api_key
MCP_SERVER_URL=your_mcp_server_endpoint
```

## Project Structure

```
relink/
├── src/
│   ├── agents/          # Buyer/seller AI agent logic
│   ├── mcp-servers/     # MCP server definitions and tools
│   ├── vision/          # Gemini Vision integration
│   ├── api/             # Backend API routes
│   ├── components/      # Frontend components
│   └── pages/           # App pages/screens
├── public/
├── .env.example
├── package.json
└── README.md
```

_Adjust this section to match your actual repo layout._

## Usage

1. **Register a company** with its name, industry type, and location.
2. **List surplus material** by uploading a photo — Gemini Vision suggests the product name, quantity, quality score, and price. Edit any field, then publish.
3. **Search as a buyer** by typing a natural-language request (material, budget, location).
4. **View matches on the map** and connect with sellers directly.

## Capacity-Sharing

Beyond reselling surplus material, ReLink also supports companies sharing **unfulfilled production capacity** with each other — using the same listing and matching system as the material marketplace.

### The Problem It Solves

A manufacturer may take on a client order that exceeds what they can produce in the given timeframe. For example: a company is contracted (outside the ReLink platform, directly by a client) to deliver 20 tons of steel, but can only produce 15 tons within the deadline. Instead of turning away the remaining 5 tons of work or missing the deadline, they can post it as a request on ReLink for another manufacturer with spare capacity to fulfill.

### How It Works

1. **Post a capacity request** — The company acts as a "buyer" on the platform and posts a request in natural language, e.g. *"I need 5 tons of steel production capacity within [timeframe]."*
2. **Agent matches capacity** — The same MCP-powered sourcing agent used for material search also handles capacity requests, matching them against other registered companies with relevant production capability, availability, and location.
3. **Results shown on map** — Matching companies with spare capacity are displayed the same way material listings are, with relevant details (capability, estimated turnaround, location).
4. **Connect and fulfill** — The requesting company connects with a matched manufacturer to fulfill the remaining order.

### Why the Same System Works for This

Both material listings and capacity requests are fundamentally a **"supply post → natural-language request → AI-matched result"** pattern, so this feature reuses the existing Sourcing MCP Server rather than requiring a separate system:

| | Material Marketplace | Capacity-Sharing |
|---|---|---|
| What's posted | Surplus material (photo + AI-extracted details) | Available/needed production capacity (description + quantity + timeframe) |
| Who initiates the match | Buyer searches for material | Company posts a capacity need, acting as buyer |
| Matching tool | `search_materials` | `search_capacity` (new MCP tool, same server) |
| Discovery | Map of sellers with matching material | Map of companies with matching spare capacity |

### New MCP Tools Required

- `post_capacity_request(company_id, material_type, quantity, deadline, location)` — creates a capacity request listing
- `post_available_capacity(company_id, material_type, max_quantity, availability_window)` — lets a company advertise spare capacity proactively
- `search_capacity(query, location, deadline)` — matches requests against available capacity

## Roadmap

- [ ] Company registration with geolocation
- [ ] Gemini Vision-based listing creation
- [ ] MCP server for listing management
- [ ] MCP server for buyer search/matching
- [ ] Map-based results view
- [ ] Capacity-sharing request flow (post request, post available capacity, match)
- [ ] In-app chat between buyer and seller

## Contributing

Contributions are welcome. Please open an issue to discuss any major changes before submitting a pull request.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "Add your feature"
git push origin feature/your-feature-name
```


## License
This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
