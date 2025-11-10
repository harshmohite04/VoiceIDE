# 🎙️ VoiceDev Partner

> Voice-powered AI development companion that lets you discuss ideas, build prototypes, and stream outputs in real-time.

## 🚀 Features

- **Real-time Voice Chat**: Natural conversation with AI using OpenAI GPT-4 Realtime API
- **Context-Aware AI**: Understands development workflows and suggests improvements
- **Prototype Building**: Automatic code generation and VM-based building (Phase 2+)
- **Live Streaming**: Real-time preview of built applications
- **Session Memory**: Persistent conversation history and project context
- **Cross-Platform**: Web app (React) + Mobile app (React Native)

## 🏗️ Architecture

```
Frontend (React)    Backend (Node.js)     AI Services
┌─────────────┐    ┌─────────────────┐   ┌─────────────┐
│ Voice UI    │◄──►│ Express/Socket  │◄─►│ OpenAI GPT-4│
│ WebRTC      │    │ Session Mgmt    │   │ Realtime    │
│ Chat UI     │    │ Firebase Auth   │   │ Whisper API │
└─────────────┘    └─────────────────┘   └─────────────┘
                            ▲
                   ┌─────────────────┐
                   │ Firebase/Store  │
                   │ User Sessions   │
                   │ Chat History    │
                   └─────────────────┘
```

## 📦 Project Structure

```
voicedev-partner/
├── packages/
│   ├── backend/          # Node.js + Express + Socket.IO
│   ├── frontend/         # React + Next.js + TypeScript
│   ├── mobile/           # React Native + Expo (Phase 5)
│   └── shared/           # Shared types and utilities
├── docs/                 # Documentation
├── docker/               # Docker configurations
└── scripts/              # Build and deployment scripts
```

## 🛠️ Tech Stack

### Phase 1: Voice Chat MVP
- **Frontend**: React + Next.js + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO + TypeScript
- **AI**: OpenAI GPT-4 Realtime API + Whisper
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Real-time**: WebSocket + WebRTC

### Future Phases
- **VM Integration**: GCP Compute Engine + Docker
- **Mobile**: React Native + Expo
- **Streaming**: WebRTC + ngrok tunneling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- OpenAI API key
- Firebase project

### Installation

```bash
# Install dependencies
npm run install:all

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Configure your API keys in .env files

# Start development servers
npm run dev
```

### Environment Variables

**Backend (.env)**:
```env
OPENAI_API_KEY=your_openai_api_key
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
PORT=3001
```

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 📋 Development Phases

- ✅ **Phase 1**: Voice + Text Realtime Chat MVP
- ⏳ **Phase 2**: AI Context Understanding & Product Planning
- ⏳ **Phase 3**: VM Integration & Prototype Building
- ⏳ **Phase 4**: Session Memory & Project History
- ⏳ **Phase 5**: Mobile App (React Native)

## 📄 License

MIT License
