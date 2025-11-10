# 🚀 VoiceDev Partner Setup Guide

## 📋 Prerequisites

- **Node.js** 18+ and npm 9+
- **OpenAI API Key** (for GPT-4 and Whisper)
- **Firebase Project** (for authentication and database)
- **Git** (for version control)

## 🛠️ Installation

### 🚨 **CRITICAL FIRST STEP: Fix Directory Path**

The current directory path contains `MobileApp&VM` which causes npm installation failures. **You MUST fix this first:**

#### **Option A: Rename Directory (Recommended)**
```bash
# Navigate to parent directory
cd "d:\harsh\Code_Playground\voice-extension\VoiceIDE\"

# Rename directory to remove special characters
ren "MobileApp&VM" "MobileAppVM"

# Your new path: d:\harsh\Code_Playground\voice-extension\VoiceIDE\MobileAppVM\voice-orch-windsurf-1.0
```

#### **Option B: Move to Clean Path**
```bash
# Create new directory
mkdir "d:\harsh\VoiceDevPartner"

# Copy project files
xcopy "d:\harsh\Code_Playground\voice-extension\VoiceIDE\MobileApp&VM\voice-orch-windsurf-1.0\*" "d:\harsh\VoiceDevPartner\" /E /H /Y
```

### 1. Install Dependencies (After Path Fix)

```bash
# Navigate to fixed path
cd [your-new-clean-path]

# Install root dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

#### Backend Environment
```bash
cd packages/backend
cp .env.example .env
```

Edit `.env` with your credentials:
```env
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment
```bash
cd packages/frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 3. Firebase Setup

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication**: Enable Google Sign-in
3. **Create Firestore Database**: Start in test mode
4. **Generate Service Account**: 
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Use the JSON content for backend environment variables

### 4. OpenAI Setup

1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Add Credits**: Ensure you have credits for GPT-4 and Whisper API usage
3. **Set Usage Limits**: Configure usage limits to avoid unexpected charges

## 🚀 Running the Application

### Development Mode

**Option 1: Run both services together (from root)**
```bash
npm run dev
```

**Option 2: Run services separately**

Terminal 1 - Backend:
```bash
cd packages/backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd packages/frontend
npm run dev
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🧪 Testing the Setup

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend Access**: Open http://localhost:3000 in browser

3. **Voice Features**: 
   - Allow microphone permissions
   - Test voice recording and playback
   - Verify Firebase authentication

## 📁 Project Structure

```
voicedev-partner/
├── packages/
│   ├── backend/              # Node.js + Express + Socket.IO
│   │   ├── src/
│   │   │   ├── config/       # Firebase, database config
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── socket/       # WebSocket handlers
│   │   │   └── utils/        # Utilities
│   │   └── package.json
│   └── frontend/             # React + Next.js
│       ├── app/              # Next.js 13+ app directory
│       ├── components/       # React components
│       ├── lib/              # Utilities and configs
│       └── package.json
├── README.md
├── SETUP.md
└── package.json
```

## 🔧 Troubleshooting

### Common Issues

1. **Path Issues with `&` Character**:
   - The directory name contains `&` which causes npm path issues
   - Install dependencies in each package directory individually
   - Consider renaming the directory to avoid special characters

2. **Firebase Authentication Errors**:
   - Verify service account JSON is correctly formatted
   - Check Firebase project ID matches environment variables
   - Ensure Firestore rules allow authenticated access

3. **OpenAI API Errors**:
   - Verify API key is valid and has credits
   - Check rate limits and usage quotas
   - Ensure you have access to GPT-4 and Whisper models

4. **Port Conflicts**:
   - Backend default: 3001
   - Frontend default: 3000
   - Change ports in environment variables if needed

### Development Tips

- **Hot Reload**: Both frontend and backend support hot reload in development
- **Logging**: Backend logs are in `packages/backend/logs/`
- **Database**: Use Firebase Console to monitor Firestore data
- **API Testing**: Use tools like Postman or curl for API testing

## 📚 Next Steps

1. **Complete Frontend Components**: VoiceChat, Header components need implementation
2. **Add Authentication UI**: Login/logout components
3. **Implement Voice Recording**: WebRTC audio capture
4. **Add Chat Interface**: Real-time message display
5. **Test Voice Pipeline**: End-to-end voice → AI → response flow

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details.
