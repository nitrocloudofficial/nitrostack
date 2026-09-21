# VulnixAI Backend

Backend server for VulnixAI with GitHub OAuth authentication and MongoDB user tracking.

## Features

- ✅ GitHub OAuth authentication
- ✅ JWT token-based authorization
- ✅ MongoDB user tracking (login history, activity)
- ✅ RESTful API endpoints
- ✅ TypeScript for type safety

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Install MongoDB

**Option 1: MongoDB Community Edition (Recommended)**
- Download: https://www.mongodb.com/try/download/community
- Install and MongoDB will run automatically

**Option 2: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Test MongoDB Connection:**
```bash
npm run test:mongodb
```

### 3. Setup GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: VulnixAI
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy the Client ID and generate a Client Secret

### 4. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your credentials:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# MongoDB
MONGO_URI=mongodb://localhost:27017/vulnixai

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# JWT
JWT_SECRET=your_random_secret_key_here
JWT_EXPIRES_IN=7d

NODE_ENV=development
```

### 5. Start the Server

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
📦 Database: vulnixai
🚀 Backend server running on http://localhost:5000
```

## User Tracking

The system automatically tracks:
- ✅ First login timestamp
- ✅ Last login timestamp
- ✅ Last active timestamp
- ✅ Login count
- ✅ User profile data (username, email, avatar, etc.)

See [USER_TRACKING.md](./USER_TRACKING.md) for details.

## API Endpoints

### Authentication

- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/verify` - Verify JWT token (returns user details)
- `POST /api/auth/logout` - Logout user

### Health Check

- `GET /health` - Server health check

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   └── database.ts         # MongoDB connection
│   ├── controllers/
│   │   └── auth.controller.ts  # Authentication controllers
│   ├── db/
│   │   └── models/
│   │       └── User.model.ts   # User schema and model
│   ├── middleware/
│   │   └── auth.middleware.ts  # JWT authentication middleware
│   ├── routes/
│   │   └── auth.routes.ts      # Authentication routes
│   ├── services/
│   │   ├── githubAuth.service.ts  # GitHub OAuth service
│   │   ├── jwt.service.ts         # JWT token service
│   │   └── user.service.ts        # User CRUD operations
│   ├── types/
│   │   └── auth.ts             # TypeScript types
│   └── index.ts                # Application entry point
├── scripts/
│   └── test-mongodb.ts         # MongoDB connection test
├── .env.example                # Environment variables template
├── MONGODB_SETUP.md            # MongoDB setup guide
├── USER_TRACKING.md            # User tracking documentation
├── package.json
└── tsconfig.json
```

## Technologies

- Express.js - Web framework
- TypeScript - Type safety
- MongoDB - Database
- Mongoose - MongoDB ODM
- JWT - Token-based authentication
- Axios - HTTP client for GitHub API
- CORS - Cross-origin resource sharing

## Documentation

- [MongoDB Setup Guide](./MONGODB_SETUP.md) - Detailed MongoDB installation and configuration
- [User Tracking](./USER_TRACKING.md) - User tracking implementation details
- [Quick Start](../MONGODB_QUICKSTART.md) - Quick setup guide

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test:mongodb` - Test MongoDB connection
