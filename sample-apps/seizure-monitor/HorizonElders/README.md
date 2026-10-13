# AISRA

**AISRA (AI Smart Resource Assistant)** is an AI-powered procurement assistant designed for home bakeries. It helps bakery owners keep track of ingredients, identify shortages before production, recommend suitable suppliers, and generate RFQs (Request for Quotation) using a Model Context Protocol (MCP) server built with NitroStack.

The idea behind AISRA is simple: small bakeries often manage inventory manually and spend a lot of time deciding what needs to be purchased and from whom. Our goal was to build an assistant that can handle these repetitive decisions so the baker can focus on production.

---

## Problem

Home bakeries usually operate with limited inventory and tight schedules. Missing a single ingredient can delay customer orders, especially during festivals or bulk order seasons.

Some common challenges include:

- Manual inventory tracking
- Last-minute ingredient shortages
- Choosing between multiple suppliers
- Lack of a structured procurement process
- Time spent preparing RFQs

AISRA attempts to simplify this workflow.

---

## Our Approach

Instead of building another inventory management system, we built an AI assistant that works on top of structured business data.

The assistant can:

- check ingredient availability
- identify low-stock items
- search approved suppliers
- recommend the most suitable supplier
- generate a structured RFQ

The project is implemented as an MCP server so it can be used through ChatGPT or NitroStudio.

---

## Features

### Inventory Analysis

Checks whether an ingredient is available and determines whether it is below the defined safety stock.

Example:

- Available
- Low Stock
- Out of Stock

---

### Supplier Search

Searches the supplier database for vendors who can provide the requested ingredient.

Information considered includes:

- price
- supplier rating
- approval status

---

### Supplier Recommendation

Ranks suppliers and recommends one based on quality, approval status and pricing.

---

### RFQ Generation

Creates a simple Request for Quotation containing supplier and ingredient details that can be used as the starting point for procurement.

---

## Tech Stack

- TypeScript
- Node.js
- NitroStack
- Model Context Protocol (MCP)
- NitroCloud
- ChatGPT

---

## Project Structure

```
src
│
├── data
│   ├── inventory.json
│   ├── vendors.json
│   ├── recipes.json
│   ├── policies.json
│   └── data-store.ts
│
├── modules
│   ├── inventory
│   ├── vendor
│   ├── decision
│   └── rfq
│
└── widgets
```

---

## MCP Tools

| Tool | Description |
|------|-------------|
| check_inventory | Checks inventory status for an ingredient |
| find_vendor | Finds suppliers for an ingredient |
| recommend_supplier | Selects the most suitable supplier |
| generate_rfq | Generates a procurement RFQ |

---

## Running the Project

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Build

```bash
npm run build
```

---

## Deployment

The project is intended to be deployed on NitroCloud and connected to ChatGPT through the Model Context Protocol.

---

## Future Improvements

There are several features we would like to add if development continues:

- Recipe-aware inventory planning
- Automatic demand forecasting
- Purchase Order generation
- Delivery tracking
- Integration with supplier APIs
- Multi-bakery support
- Sales analytics

---

## Team

Built as part of the **NitroStack Hackathon**.

Team Members:

- Sai Varun
- Vanshika Immadi
- <Member 3>
- <Member 4>

---

## Demo

### Inventory Analysis

<img width="1092" height="740" alt="image" src="https://github.com/user-attachments/assets/37f694fe-4ba8-4bf1-9beb-6c459d005ba0" />


---

### Supplier Recommendation

<img width="1148" height="846" alt="image" src="https://github.com/user-attachments/assets/505b2b7a-1b35-4b1f-9174-d389079524ff" />


---

### RFQ Generation

<img width="726" height="897" alt="image" src="https://github.com/user-attachments/assets/abdb8fd1-022b-4ac7-86e3-b22dc380fb17" />


---
###Deployed link
Chat: https://nitrochat-aisra-chat-horizonelders-amrita-university-coimbatore.app.nitrocloud.ai/
MCP server: https://aisra-6a653a1c-horizonelders-amrita-university-coimbatore.app.nitrocloud.ai/

---

### NitroCloud Deployment

<img width="1540" height="747" alt="image" src="https://github.com/user-attachments/assets/8611d2d4-fd4d-4b6f-802f-41169e07d3ff" />

---


