# Development Guide

## Port Configuration

### Frontend
- **Development**: Port `8080` (Vite dev server)
- **Production Preview**: Port `4173` (Vite preview after build)

### Backend
- **Development**: Port `5000` (default, configurable via `PORT` env variable)
- **Production**: Port `10000` (or as configured in deployment)

## Running the Application

### Development Mode (Separate Terminals)

#### Terminal 1 - Frontend
```bash
npm run dev:frontend
```
This starts the Vite development server on `http://localhost:8080`

#### Terminal 2 - Backend
```bash
npm run dev:backend
```
This starts the Express backend server on `http://localhost:5000`

### Production Mode

#### Build Frontend
```bash
npm run build:frontend
```
This creates optimized production files in the `dist/` folder.

#### Build Backend
```bash
npm run build:backend
```
This compiles TypeScript to JavaScript in `backend/dist/` folder.

#### Start Frontend (Preview)
```bash
npm run start:frontend
```
This serves the built frontend on `http://localhost:4173`

#### Start Backend
```bash
npm run start:backend
```
This runs the compiled backend on `http://localhost:5000` (or configured PORT)

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Backend (backend/.env)
```env
PORT=5000
FRONTEND_URL=http://localhost:8080
MONGO_URI=mongodb://localhost:27017/vulnixai
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEYS=your_gemini_api_keys
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Quick Start Commands

| Command | Description |
|---------|-------------|
| `npm run dev:frontend` | Start frontend dev server (port 8080) |
| `npm run dev:backend` | Start backend dev server (port 5000) |
| `npm run build:frontend` | Build frontend for production |
| `npm run build:backend` | Build backend for production |
| `npm run start:frontend` | Preview built frontend (port 4173) |
| `npm run start:backend` | Run built backend (port 5000) |

## Notes

- The frontend dev server (port 8080) proxies API requests to the backend (port 5000)
- Make sure MongoDB is running before starting the backend
- The backend will start even if MongoDB is not available, but some features will be disabled
