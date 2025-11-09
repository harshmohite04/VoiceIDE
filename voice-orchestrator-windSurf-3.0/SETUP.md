# Voice PM Assistant - Setup Guide

This guide will help you set up the Voice PM Assistant extension for Windsurf IDE.

## 🚨 Quick Fix: "Speech Recognition Not Allowed"

If you're getting a permission error:

1. **Allow microphone access** when prompted in the voice recognition window
2. **Check Windows microphone permissions**: Settings > Privacy & Security > Microphone
3. **Click "Request Permission Again"** in the voice recognition panel
4. **Restart Windsurf** if the issue persists

📖 *See detailed troubleshooting below for more solutions.*

## 📋 Prerequisites

### 1. Google Cloud Text-to-Speech

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the "Cloud Text-to-Speech API"
4. Go to "IAM & Admin" > "Service Accounts"
5. Create a new service account with "Text-to-Speech Admin" role
6. Generate and download a JSON key file
7. Note your Project ID

### 2. OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-`)
6. Ensure you have credits/billing set up

## 🔧 Installation Steps

### Step 1: Install the Extension

1. Download the `.vsix` file
2. Open Windsurf IDE
3. Go to Extensions panel (`Ctrl+Shift+X`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file
6. Restart Windsurf when prompted

### Step 2: Configure API Keys

1. Open Windsurf Settings (`Ctrl+,`)
2. Search for "Voice PM"
3. Configure the following settings:

```json
{
  "voicePM.openaiApiKey": "sk-your-openai-api-key-here",
  "voicePM.googleCloudKeyFile": "C:/path/to/your/service-account-key.json",
  "voicePM.googleProjectId": "your-google-cloud-project-id"
}
```

### Step 3: Test the Setup

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run "Voice PM: Open Voice PM Dashboard"
3. Click "Start Voice" button
4. Say "Hello, can you hear me?"
5. You should see your speech transcribed and get an AI response

## 🎛️ Advanced Configuration

### Voice Settings

```json
{
  "voicePM.voiceLanguage": "en-US",
  "voicePM.geminiVoice": "en-US-Standard-J",
  "voicePM.conversationMode": "product_manager"
}
```

### Available Voice Languages

- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `es-ES` - Spanish (Spain)
- `fr-FR` - French (France)
- `de-DE` - German (Germany)
- `it-IT` - Italian (Italy)
- `pt-BR` - Portuguese (Brazil)
- `ja-JP` - Japanese
- `ko-KR` - Korean
- `zh-CN` - Chinese (Mandarin)

### Available AI Voices (Google Cloud TTS)

**English Standard Voices:**
- `en-US-Standard-A` (Female)
- `en-US-Standard-B` (Male)
- `en-US-Standard-C` (Female)
- `en-US-Standard-D` (Male)
- `en-US-Standard-E` (Female)
- `en-US-Standard-F` (Female)
- `en-US-Standard-G` (Female)
- `en-US-Standard-H` (Female)
- `en-US-Standard-I` (Male)
- `en-US-Standard-J` (Male)

**English WaveNet Voices (Premium):**
- `en-US-Wavenet-A` (Female, natural)
- `en-US-Wavenet-B` (Male, natural)
- `en-US-Wavenet-C` (Female, natural)
- `en-US-Wavenet-D` (Male, natural)
- `en-US-Wavenet-E` (Female, natural)
- `en-US-Wavenet-F` (Female, natural)

## 🚀 Quick Start Commands

### Keyboard Shortcuts
- `Ctrl+Shift+V` - Start/Stop voice conversation
- `Ctrl+Shift+M` - Toggle microphone mute

### Command Palette Commands
- `Voice PM: Start Voice Discussion`
- `Voice PM: Stop Voice Discussion`
- `Voice PM: Toggle Microphone`
- `Voice PM: Open Voice PM Dashboard`

## 🔍 Troubleshooting

### Issue: "Please configure Google Cloud TTS and OpenAI API keys"

**Solution:**
1. Verify API keys and service account file path are correctly entered in settings
2. Check that the Google Cloud service account JSON file exists at the specified path
3. Ensure the keys are valid and the Google Cloud project has TTS API enabled

### Issue: "Speech recognition not allowed" / Permission Denied

**This is the most common issue. Here's how to fix it:**

**Step 1: Check Browser Compatibility**
- Windsurf uses Chromium engine, which supports Web Speech API
- Ensure you're using a recent version of Windsurf

**Step 2: Grant Microphone Permissions**
1. **In the Voice Recognition window:**
   - Click "Request Permission Again" button
   - Allow microphone access when prompted

2. **If no permission prompt appears:**
   - Look for a microphone icon in the webview address bar
   - Click it and select "Allow"
   - Refresh the voice recognition panel

3. **Windows System Permissions:**
   - Go to Windows Settings > Privacy & Security > Microphone
   - Ensure "Microphone access" is enabled
   - Allow "Desktop apps to access your microphone"

**Step 3: Browser Settings (if using external browser)**
1. Open Chrome/Edge settings
2. Go to Privacy and Security > Site Settings > Microphone
3. Ensure microphone is not blocked
4. Add your domain to allowed sites

**Step 4: Test Your Microphone**
1. Test in Windows Sound Recorder or another app
2. Check microphone levels in Windows Sound settings
3. Ensure the correct microphone is selected as default

**Step 5: Restart and Retry**
1. Close all Windsurf windows
2. Restart Windsurf completely
3. Try the voice recognition again

### Issue: AI not responding

**Possible Causes:**
1. **Invalid OpenAI key**: Key might be expired or invalid
2. **No credits**: OpenAI account might be out of credits
3. **Rate limits**: Too many requests in short time
4. **Network issues**: Connection problems

**Solutions:**
1. Verify OpenAI API key is correct
2. Check OpenAI account billing and usage
3. Wait a moment and try again
4. Check internet connection

### Issue: Extension not loading

**Solutions:**
1. Restart Windsurf IDE
2. Check if extension is enabled in Extensions panel
3. Look for errors in Developer Console (`Help > Toggle Developer Tools`)
4. Reinstall the extension

## 💡 Usage Tips

### Best Practices

1. **Speak clearly**: Use natural speech pace
2. **Quiet environment**: Minimize background noise
3. **Good microphone**: Use a quality microphone for better recognition
4. **Internet connection**: Ensure stable connection for best performance

### Conversation Starters

**Product Manager Mode:**
- "Help me create a product roadmap for Q1"
- "What metrics should I track for user engagement?"
- "How should I prioritize these feature requests?"

**Discussion Partner Mode:**
- "Let's discuss the pros and cons of this approach"
- "What are some alternative solutions to this problem?"
- "Help me think through this technical decision"

**Code Reviewer Mode:**
- "Review this function for potential improvements"
- "What security concerns should I consider?"
- "How can I optimize this algorithm?"

**Brainstorming Mode:**
- "Let's brainstorm innovative features for our app"
- "What are some creative ways to solve this UX problem?"
- "Help me think outside the box on this challenge"

## 🔒 Security Notes

- API keys are stored in VS Code settings (encrypted)
- Voice data is processed by Azure Speech Services
- Conversations are processed by OpenAI
- No conversation history is stored locally
- Follow your organization's data privacy policies

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the main README.md
3. Check the GitHub Issues page
4. Contact support with detailed error information

---

**Happy coding with your new AI voice assistant! 🎤✨**
