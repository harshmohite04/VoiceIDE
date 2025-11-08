# 🔧 Voice Assistant Troubleshooting Guide

## ❌ "Failed to Start Voice Listening" Error

### **Most Common Causes & Solutions**

#### 🔑 **1. Missing OpenAI API Key (90% of cases)**

**Symptoms:**
- "Failed to start voice listening" error
- "OpenAI API key not configured" message
- Extension shows as not initialized

**Solution:**
1. **Get your OpenAI API Key:**
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key if you don't have one
   - Copy the key (starts with `sk-`)

2. **Configure in VS Code:**
   - Press `Ctrl+,` to open Settings
   - Search for "Voice Orchestrator"
   - Paste your API key in `voiceOrchestrator.openaiApiKey`
   - **OR** add to your `settings.json`:
   ```json
   {
     "voiceOrchestrator.openaiApiKey": "sk-your-actual-api-key-here"
   }
   ```

3. **Reload VS Code:**
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

#### 🔄 **2. Extension Not Properly Initialized**

**Symptoms:**
- Extension appears to load but voice commands don't work
- Status bar shows no microphone icon
- Commands are grayed out

**Solution:**
1. **Check Extension Status:**
   - Look for microphone icon in status bar (bottom right)
   - If missing, extension didn't initialize properly

2. **Reinstall Extension:**
   - Press `Ctrl+Shift+P`
   - Type "Extensions: Install from VSIX"
   - Select the updated `windsurf-voice-assistant.vsix`

3. **Check Output Logs:**
   - Press `Ctrl+Shift+U` (Output panel)
   - Select "Voice Orchestrator" from dropdown
   - Look for initialization errors

#### 🌐 **3. Network/API Connection Issues**

**Symptoms:**
- "Network error" or "Failed to connect" messages
- Extension initializes but fails when trying to use voice

**Solution:**
1. **Check Internet Connection**
2. **Verify API Key is Valid:**
   - Test at [OpenAI Playground](https://platform.openai.com/playground)
3. **Check Firewall/Proxy Settings**

#### 🔧 **4. VS Code Environment Issues**

**Symptoms:**
- Extension loads but crashes when starting voice
- Browser API errors in logs

**Solution:**
1. **Update VS Code:**
   - Ensure you're running VS Code 1.74.0 or later
2. **Clear Extension Cache:**
   - Close VS Code
   - Delete `~/.vscode/extensions` cache (if safe to do so)
   - Restart VS Code

## 🚀 **Step-by-Step Testing Process**

### **Phase 1: Basic Setup**
1. ✅ Install the extension from VSIX file
2. ✅ Configure OpenAI API key in settings
3. ✅ Reload VS Code window
4. ✅ Check for microphone icon in status bar

### **Phase 2: Functionality Test**
1. ✅ Press `Ctrl+Shift+V` or use Command Palette
2. ✅ Should see input dialog box (not actual voice recording)
3. ✅ Type a test command: "Hello, can you help me?"
4. ✅ Should see AI response in notification popup

### **Phase 3: Advanced Features**
1. ✅ Try code generation: "Create a React component"
2. ✅ Test task planning: "Build a login form with validation"
3. ✅ Check IDE integration: Generated code should appear

## 🔍 **Diagnostic Commands**

### **Check Extension Status:**
```
Ctrl+Shift+P → "Voice Orchestrator: Start Voice Assistant"
```

### **View Logs:**
```
Ctrl+Shift+U → Select "Voice Orchestrator"
```

### **Reset Extension:**
```
Ctrl+Shift+P → "Developer: Reload Window"
```

## 📋 **Common Error Messages & Solutions**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "OpenAI API key not configured" | Missing API key | Add API key to settings |
| "Voice Recognition Service not initialized" | Service failed to start | Check API key and reload |
| "Failed to connect to OpenAI service" | Network/API issue | Check internet and API key |
| "Extension not activated" | VS Code issue | Reload window or reinstall |

## 🆘 **Still Having Issues?**

### **Collect Debug Information:**
1. **Extension Version:** Check package.json version
2. **VS Code Version:** Help → About
3. **Error Logs:** Copy from Output panel
4. **Settings:** Export Voice Orchestrator settings

### **Reset Everything:**
1. Uninstall extension
2. Clear settings: Remove all `voiceOrchestrator.*` entries
3. Reload VS Code
4. Reinstall from fresh VSIX file
5. Reconfigure API key

### **Alternative Approach:**
If voice simulation isn't working, you can still use the AI conversation features:
- The extension processes text input through OpenAI
- Task planning and code generation still work
- IDE integration remains functional

## ✅ **Success Indicators**

When everything is working correctly, you should see:
- 🎤 Microphone icon in status bar
- ✅ "Voice Assistant is ready!" message on activation
- 📝 Input dialog when pressing `Ctrl+Shift+V`
- 🤖 AI responses in notification popups
- 💻 Generated code appearing in editor

---

**Updated Extension:** `windsurf-voice-assistant.vsix` (4.91MB)
**Last Updated:** November 2024
**Status:** ✅ Ready for use with improved error handling
