# 🔧 VoiceDev Partner - Troubleshooting Guide

## 🚨 Critical Issue: Directory Path with `&` Character

### **Problem**
The directory path contains `MobileApp&VM` which causes npm installation failures due to the `&` character being interpreted as a command separator in Windows.

### **Error Symptoms**
```
npm error 'VM\voice-orch-windsurf-1.0\node_modules\.bin\' is not recognized as an internal or external command
npm error Cannot find module 'D:\harsh\Code_Playground\voice-extension\VoiceIDE\napi-postinstall\lib\cli.js'
```

### **Solutions**

#### **Option 1: Rename Directory (Recommended)**
```bash
# Navigate to parent directory
cd "d:\harsh\Code_Playground\voice-extension\VoiceIDE\"

# Rename the directory to remove special characters
ren "MobileApp&VM" "MobileAppVM"

# Now the path becomes:
# d:\harsh\Code_Playground\voice-extension\VoiceIDE\MobileAppVM\voice-orch-windsurf-1.0
```

#### **Option 2: Move to New Location**
```bash
# Create new directory without special characters
mkdir "d:\harsh\Code_Playground\voice-extension\VoiceIDE\VoiceDevPartner"

# Copy all files to new location
xcopy "d:\harsh\Code_Playground\voice-extension\VoiceIDE\MobileApp&VM\voice-orch-windsurf-1.0\*" "d:\harsh\Code_Playground\voice-extension\VoiceIDE\VoiceDevPartner\" /E /H /Y
```

#### **Option 3: Use Short Path Names**
```bash
# Get the short path name (8.3 format)
dir /x "d:\harsh\Code_Playground\voice-extension\VoiceIDE\"

# Use the short name (usually something like MOBILE~1)
cd "d:\harsh\Code_Playground\voice-extension\VoiceIDE\MOBILE~1\voice-orch-windsurf-1.0"
```

## 📦 Installation Steps After Path Fix

### 1. Install Root Dependencies
```bash
cd [your-fixed-path]
npm install
```

### 2. Install Backend Dependencies
```bash
cd packages/backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd packages/frontend
npm install
```

## 🔍 Verification Steps

### 1. Check Backend Installation
```bash
cd packages/backend
npm run build
# Should complete without errors
```

### 2. Check Frontend Installation
```bash
cd packages/frontend
npm run build
# Should complete without errors
```

### 3. Test Development Servers
```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend  
cd packages/frontend
npm run dev
```

## 🛠️ Common Issues & Solutions

### **Issue: TypeScript Errors**
**Symptoms**: "Cannot find module" errors for React, Firebase, etc.

**Solution**: 
```bash
# Ensure all dependencies are installed
cd packages/frontend
npm install react react-dom @types/react @types/react-dom
npm install firebase socket.io-client lucide-react
```

### **Issue: Firebase Configuration**
**Symptoms**: Firebase auth/firestore errors

**Solution**:
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication with Google provider
3. Create Firestore database
4. Generate service account key
5. Update environment variables

### **Issue: OpenAI API Errors**
**Symptoms**: 401 Unauthorized, rate limit errors

**Solution**:
1. Verify API key at https://platform.openai.com/api-keys
2. Check billing and usage limits
3. Ensure you have access to GPT-4 and Whisper models

### **Issue: Port Conflicts**
**Symptoms**: "Port already in use" errors

**Solution**:
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill processes if needed
taskkill /PID [process_id] /F

# Or change ports in environment variables
```

### **Issue: CORS Errors**
**Symptoms**: Cross-origin request blocked

**Solution**:
1. Verify `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`
2. Check `FRONTEND_URL` in backend `.env`
3. Ensure both servers are running on correct ports

## 🧪 Testing Checklist

### Backend Health Check
- [ ] `GET http://localhost:3001/health` returns `{"status":"ok"}`
- [ ] Firebase connection successful (check logs)
- [ ] OpenAI API key valid

### Frontend Functionality
- [ ] Page loads without console errors
- [ ] Firebase authentication works
- [ ] Socket.IO connection established
- [ ] Voice recording permissions granted

### End-to-End Voice Flow
- [ ] User can sign in with Google
- [ ] Microphone access granted
- [ ] Voice recording starts/stops
- [ ] Audio sent to backend
- [ ] AI response received
- [ ] Text-to-speech plays

## 📞 Getting Help

### Debug Information to Collect
1. **System Info**:
   - OS version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)

2. **Error Logs**:
   - Backend logs (`packages/backend/logs/`)
   - Browser console errors
   - npm install error logs

3. **Configuration**:
   - Environment variables (redacted)
   - Firebase project settings
   - API key validity

### Log Analysis
```bash
# Backend logs
tail -f packages/backend/logs/combined.log

# Frontend development logs
cd packages/frontend && npm run dev

# Check npm cache issues
npm cache clean --force
```

## 🔄 Reset Instructions

### Complete Reset
```bash
# Remove all node_modules
rm -rf node_modules packages/*/node_modules

# Remove package-lock files
rm -f package-lock.json packages/*/package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall everything
npm run install:all
```

### Database Reset
```bash
# Clear Firestore data (via Firebase Console)
# Regenerate Firebase service account key
# Update environment variables
```

## 📚 Additional Resources

- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [Socket.IO Debugging](https://socket.io/docs/v4/troubleshooting-connection-issues/)

## 🎯 Success Indicators

When everything is working correctly, you should see:

1. **Backend Console**:
   ```
   🚀 VoiceDev Partner Backend running on port 3001
   🔥 Socket.IO server ready for connections
   ✅ Firebase Admin initialized successfully
   ```

2. **Frontend Console**:
   ```
   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.x:3000
   ```

3. **Browser Console**:
   ```
   Connected to server
   Firebase Auth initialized
   ```

4. **Voice Chat Interface**:
   - Green "Connected" status indicator
   - Functional voice recording button
   - Real-time message display
   - Audio playback working
