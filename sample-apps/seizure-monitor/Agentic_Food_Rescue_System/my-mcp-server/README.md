# 🍲 Agentic AI Food Rescue System

<p align="center">
  <em>An autonomous Model Context Protocol (MCP) server that intelligently routes surplus food from restaurants to NGOs using AI orchestration, automated regional voice calls, and real-time logistics matching.</em>
</p>

---

## 🚀 Overview

The **Agentic AI Food Rescue System** by **Team-DROS** revolutionizes food rescue operations. Built on **NitroStack** (the official MCP Framework), this system acts as the intelligent backend for Large Language Models (LLMs) to seamlessly orchestrate food donations without human intervention. 

When surplus food is logged, the AI autonomously queries a PostgreSQL database to find the most optimal NGO based on capacity and distance (using Haversine logic). It then triggers a real-time **Twilio voice call** to the NGO, dynamically generating localized speech (Hindi, Tamil, English) via **Sarvam AI**'s Text-to-Speech models, and follows up with an SMS confirmation.

## ✨ Key Features

- **🧠 Agentic Orchestration:** Fully integrated with Claude Desktop & NitroStudio. AI agents can autonomously log donations and trigger the entire rescue pipeline through a simple chat prompt.
- **📍 Smart Geographic Matching:** Automatically matches restaurants with the closest NGOs capable of handling the specific food type and serving size.
- **📞 Automated Dispatch Calls (Twilio):** Automatically dials the matched NGO to confirm the food rescue, complete with smart retries and timeout handling.
- **🗣️ Regional Voice Synthesis (Sarvam AI):** Leverages Sarvam AI's advanced models to generate real-time voice prompts in the NGO's preferred regional language (e.g., Hindi, Tamil) for maximum accessibility.
- **📱 Background SMS Confirmations:** Decoupled architecture ensures the AI doesn't wait for SMS deliveries, sending real-time background SMS receipts once an NGO accepts a batch.
- **☁️ Production Ready:** Optimized for cloud deployments with robust ES Module resolution, fallback audio-hosting endpoints, and minimal overhead.

## 🛠️ Technology Stack

- **Framework:** [NitroStack](https://nitrostack.ai/) (Model Context Protocol)
- **Database:** PostgreSQL (pg)
- **Communications:** Twilio Voice API & SMS
- **Voice AI:** Sarvam AI (Text-to-Speech)
- **Validation:** Zod
- **Runtime:** Node.js (ESM Native)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Team-DROS/Hack1.git
   cd Hack1/my-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the project root with the following credentials:
   ```env
   # PostgreSQL Connection
   DATABASE_URL=postgres://user:password@localhost:5432/foodrescue

   # Twilio Credentials
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=+1234567890

   # Sarvam AI Credentials
   SARVAM_API_KEY=your_sarvam_api_key
   ```

## ⚙️ Running the Server

**Development Mode:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

## 🤖 Using the MCP Tools

Once the server is connected to your MCP client (like Claude Desktop or NitroStudio), the LLM will have access to the following tools:

- `create_donation`: Logs a new surplus food batch (veg/non-veg, servings, ready time).
- `orchestrate_donation`: Automatically matches the donation to the best NGO and triggers the automated call dispatch.
- `test_twilio_call`: A diagnostic tool to verify telecom connectivity.

### Example AI Prompt
> *"Please create a new donation for 50 servings of veg food ready in 30 mins, and orchestrate the rescue call for it."*

The AI will sequentially execute `create_donation`, read the Database result, and execute `orchestrate_donation`, resulting in a real-world phone call to an NGO!

## 🤝 Contributing
Built with ❤️ by **Team-DROS** during the Hackathon. Pull requests and feedback are welcome!
