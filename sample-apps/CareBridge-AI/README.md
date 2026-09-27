# CareBridge AI – Intelligent Personal Health Assistant

## 🏥 Project Overview

CareBridge AI is an AI-powered healthcare assistant that helps users throughout their healthcare journey by:

• **Understanding symptoms** - Analyzes symptoms with user's medical context
• **Explaining medical reports** - Converts medical jargon into simple language
• **Tracking health trends** - Compares reports over time to show improvement/decline
• **Generating summaries** - Creates doctor-friendly health summaries
• **Maintaining history** - Remembers user's medical profile and conversations

---

## 🎯 Key Features

✅ **User Profiles** - Store personal health information  
✅ **Health History** - Track chronic diseases, medications, allergies  
✅ **Symptom Guidance** - AI-powered symptom analysis with educational guidance  
✅ **Medical Report Analysis** - Upload PDFs, extract data, explain in simple terms  
✅ **Trend Analysis** - Compare reports over time  
✅ **Health Summaries** - Generate comprehensive patient summaries  
✅ **Chat History** - Full conversation history with AI  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│              (Simple UI - Phase 4)                          │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTP Requests
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Express/Node.js)                  │
│         (Optimized - Main Priority - Phase 1-3)            │
│                                                              │
│  ├─ /api/profile      → User management                    │
│  ├─ /api/health-history → Health context                  │
│  ├─ /api/symptoms     → Symptom analysis (MCP)            │
│  ├─ /api/reports      → OCR + analysis (MCP)              │
│  ├─ /api/trends       → Trend comparison (MCP)            │
│  ├─ /api/summary      → Health summary (MCP)              │
│  └─ /api/chat         → Conversation history              │
└────────────────────┬──────────────────────────────────────────┘
                     │ NitroStack SDK Calls
                     ↓
┌─────────────────────────────────────────────────────────────┐
│       MCP SERVERS (NitroCloud)                              │
│  (Built in Nitro Studio - Phase 2)                         │
│                                                              │
│  ├─ Symptom Guidance Agent                                 │
│  ├─ OCR Extraction Agent                                   │
│  ├─ Report Analysis Agent                                  │
│  ├─ Trend Analysis Agent                                   │
│  └─ Health Summary Agent                                   │
└────────────────────┬──────────────────────────────────────────┘
                     │ AI Processing
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Claude AI (via NitroStack)                     │
│           (Powers all AI agents)                            │
└────────────────────┬──────────────────────────────────────────┘
                     │ Response
                     ↓
┌─────────────────────────────────────────────────────────────┐
│          DATABASE (Firebase/Supabase)                       │
│                                                              │
│  ├─ Users Collection                                        │
│  ├─ Health History Collection                               │
│  ├─ Medical Reports Collection                              │
│  ├─ Chat History Collection                                 │
│  └─ Health Summaries Collection                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (20.x recommended)
- Firebase/Supabase account
- NitroCloud account
- Git

### Installation (5 minutes)

**1. Clone and setup backend**
```bash
git clone https://github.com/yourusername/CareBridge-AI
cd CareBridge-AI/backend
npm install
```

**2. Configure environment**
```bash
cp .env.template .env
# Edit .env with your values:
# - FIREBASE_SERVICE_ACCOUNT
# - NITROSTACK_API_KEY
# - NITROSTACK_SERVER_URL
```

**3. Start backend**
```bash
npm run dev
```

**Expected output:**
```
✅ Backend running on port 3001
✅ Firebase connected
✅ NitroStack configured
```

**4. Run tests**
```bash
npm test
```

---

## 📁 Project Structure

```
CareBridge-AI/
├── backend/
│   ├── config/
│   │   ├── db.js           ← Firebase setup
│   │   └── nitrostack.js   ← MCP client setup
│   ├── routes/
│   │   ├── profile.js
│   │   ├── healthHistory.js
│   │   ├── symptoms.js      ← MCP integration
│   │   ├── reports.js       ← MCP integration
│   │   ├── trends.js        ← MCP integration
│   │   ├── summary.js       ← MCP integration
│   │   └── chat.js
│   ├── tests/
│   │   └── api.test.js
│   ├── server.js
│   ├── .env
│   └── package.json
├── nitro-workflows/        ← Nitro Studio project
│   ├── src/
│   │   ├── modules/
│   │   │   ├── symptom.tools.ts
│   │   │   ├── ocr.tools.ts
│   │   │   ├── analysis.tools.ts
│   │   │   ├── trends.tools.ts
│   │   │   └── summary.tools.ts
│   │   └── app.module.ts
│   └── package.json
├── frontend/               ← React (Phase 4)
└── README.md
```

---

## 🔧 Configuration Guide

### Firebase Setup
1. Create project at https://console.firebase.google.com
2. Create Firestore database
3. Create collections: users, health_history, medical_reports, chat_history
4. Generate service account key
5. Add to .env

### NitroStack Setup
1. Create app at https://nitrocloud.ai
2. Deploy MCP server with `nitrostack-cli`
3. Get service URL
4. Get API key from Settings → API Keys
5. Add to .env

### Environment Variables
```
PORT=3001
NODE_ENV=development
FIREBASE_DATABASE_URL=...
FIREBASE_SERVICE_ACCOUNT=...
NITROSTACK_API_KEY=nsk_live_...
NITROSTACK_SERVER_URL=https://...
```

---

## 📚 API Endpoints

### Profile Management
```
POST   /api/profile              → Create user
GET    /api/profile/:userId      → Get user
PUT    /api/profile/:userId      → Update user
DELETE /api/profile/:userId      → Delete user
```

### Health History
```
POST   /api/health-history       → Add/update history
GET    /api/health-history/:userId → Get history
PUT    /api/health-history/:userId → Update history
```

### Symptoms (MCP)
```
POST   /api/symptoms/analyze     → Analyze symptom
POST   /api/symptoms/ask-followup → Ask follow-up Q
GET    /api/symptoms/:userId     → Get symptom history
```

### Medical Reports (MCP)
```
POST   /api/reports/upload       → Upload + analyze report
GET    /api/reports/:userId      → Get all reports
GET    /api/reports/:userId/:reportId → Get specific report
DELETE /api/reports/:userId/:reportId → Delete report
```

### Trends (MCP)
```
POST   /api/trends/compare       → Compare two reports
GET    /api/trends/:userId       → Get health trends
GET    /api/trends/timeline/:userId → Get health timeline
```

### Summary (MCP)
```
GET    /api/summary/:userId      → Generate summary
POST   /api/summary/:userId/export → Export as text
GET    /api/summary/:userId/history → Get all summaries
```

### Chat
```
GET    /api/chat/:userId         → Get chat history
POST   /api/chat/:userId/clear   → Clear history
GET    /api/chat/:userId/filter  → Filter by type
POST   /api/chat/:userId/export  → Export chat
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Create User
```bash
curl -X POST http://localhost:3001/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "age": 25,
    "email": "test@test.com"
  }'
```

### Run Full Test Suite
```bash
npm test
```

---

## 🤝 Integration with NitroStack

The backend uses **NitroStack SDK** to call MCP agents deployed on NitroCloud:

**Example: Symptom Analysis**
```javascript
// Backend receives symptom from user
const userInput = "I have chest pain";

// Backend calls NitroStack SDK
const guidance = await nitroClient.callAgent('symptom-guidance-agent', {
  symptom: userInput,
  userContext: userProfile
});

// Claude AI (via MCP) processes and responds
// Response contains educational guidance
// Backend returns to frontend
```

---

## 📊 Development Timeline

**Hours 0-8:** Backend API setup (COMPLETED)
**Hours 8-16:** NitroStack MCP agents (IN PROGRESS)
**Hours 16-20:** Testing & optimization (NEXT)
**Hours 20-24:** Simple frontend & demo (FINAL)

---

## 📝 Hackathon Strategy

**Priority:** Backend first, UI second

1. **Optimized Backend** (70% effort)
   - All API endpoints working
   - MCP integration tested
   - Error handling robust
   - Database queries optimized

2. **MCP Workflows** (20% effort)
   - All 5 agents deployed
   - Each agent tested independently
   - Integration verified

3. **Simple Frontend** (10% effort)
   - Basic forms only
   - Show backend power
   - Demo ready

---

## 🎯 Hackathon Pitch

**What makes this special:**
- ✅ Multiple AI agents working together (not just one chatbot)
- ✅ Real medical use case (symptom + report analysis)
- ✅ Backend-centric architecture (scalable)
- ✅ Full NitroStack integration showcase
- ✅ Production-ready code

**Judges will see:**
1. Backend API in action
2. MCP agents coordinating
3. Claude AI enhancing healthcare
4. NitroStack platform benefits

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Node version
node -v  # Should be 18+

# Check port availability
lsof -i :3001

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Firebase connection error
```bash
# Verify .env
echo $FIREBASE_SERVICE_ACCOUNT  # Should show JSON

# Check Firestore rules
# Allow authenticated requests in Firebase Console
```

### MCP agent not responding
```bash
# Check NitroCloud deployment
# Visit: https://nitrocloud.ai → Your App → Deployments

# Verify API key
echo $NITROSTACK_API_KEY  # Should start with nsk_live_

# Check server URL
curl $NITROSTACK_SERVER_URL/health
```

---

## 📞 Support & Resources

- **Documentation:** See SETUP-GUIDE.md
- **NitroStack Docs:** https://docs.nitrostack.ai
- **Firebase Docs:** https://firebase.google.com/docs
- **GitHub Issues:** Create an issue in repository

---

## 👥 Team

- **TVSS Phanindra Guptha** - AI & Data Science BTech
- **Amrita Vishwa Vidya Peetham** - College

---

## 📄 License

MIT License - See LICENSE file

---

## 🎉 Ready to Build?

1. Follow SETUP-GUIDE.md for step-by-step instructions
2. Test each component as you go
3. Commit regularly to GitHub
4. Focus on backend quality
5. Show MCP integration in demo

**Let's build something amazing! 🚀**
