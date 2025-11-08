# Voice Orchestrator Setup Guide

## Prerequisites

Before setting up the Voice Orchestrator extension, you'll need:

### 1. API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

#### Azure Speech Service
1. Visit [Azure Portal](https://portal.azure.com)
2. Create a new "Speech Services" resource
3. Get your API key and region from the resource overview
4. Note down both the key and region (e.g., "eastus", "westeurope")

### 2. System Requirements

- Node.js 18+ installed
- VS Code, Windsurf, or Cursor IDE
- Microphone access permissions
- Internet connection for API calls

## Installation Steps

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd voice-orchestrator-windSurf-2.0

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure API Keys

Edit the `.env` file with your API credentials:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Azure Speech Service Configuration
AZURE_SPEECH_KEY=your-azure-speech-key-here
AZURE_SPEECH_REGION=your-azure-region-here

# Voice Configuration
VOICE_LANGUAGE=en-US
AI_MODEL=gpt-4

# Server Configuration
PORT=3001
HOST=localhost
```

### 3. Build the Extension

```bash
# Build TypeScript
npm run build

# Run tests (optional)
npm test

# Lint code (optional)
npm run lint
```

### 4. Package for Your IDE

#### For Windsurf:
```bash
npm run package:windsurf
```

#### For Cursor:
```bash
npm run package:cursor
```

This will create `.vsix` files that you can install in your IDE.

### 5. Install the Extension

#### In VS Code/Windsurf/Cursor:
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Extensions: Install from VSIX"
3. Select the generated `.vsix` file
4. Reload the IDE when prompted

## Configuration

### IDE Settings

After installation, configure the extension in your IDE settings:

```json
{
  "voiceOrchestrator.openaiApiKey": "your-openai-api-key",
  "voiceOrchestrator.azureSpeechKey": "your-azure-speech-key",
  "voiceOrchestrator.azureSpeechRegion": "your-azure-region",
  "voiceOrchestrator.voiceLanguage": "en-US",
  "voiceOrchestrator.aiModel": "gpt-4"
}
```

### Microphone Permissions

Ensure your browser/IDE has microphone permissions:

1. **Windows**: Check Windows Privacy Settings > Microphone
2. **macOS**: Check System Preferences > Security & Privacy > Microphone
3. **Linux**: Check your system's audio permissions

## First Use

### 1. Activate the Extension

- Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
- Or use Command Palette: "Start Voice Assistant"

### 2. Test Voice Recognition

1. Click "Start Listening" in the status bar
2. Say "Hello, can you help me with my code?"
3. Check if the AI responds appropriately

### 3. Try Basic Commands

- "Explain this function" (with code selected)
- "Create a simple React component"
- "How do I fix this error?" (with error visible)

## Troubleshooting

### Common Issues

#### Voice Not Recognized
- Check microphone permissions
- Verify Azure Speech Service credentials
- Test with simple, clear speech
- Check internet connection

#### AI Not Responding
- Verify OpenAI API key is correct
- Check API quota and billing status
- Ensure model name is correct (gpt-4, gpt-3.5-turbo)

#### Extension Not Loading
- Check VS Code version compatibility (1.74.0+)
- Verify all dependencies are installed
- Check extension logs in Developer Tools

#### Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Debug Mode

Enable detailed logging:

```json
{
  "voiceOrchestrator.debugMode": true
}
```

Check logs in:
- VS Code: Help > Toggle Developer Tools > Console
- Extension Output: View > Output > Voice Orchestrator

### Network Issues

If you're behind a corporate firewall:

1. Ensure HTTPS traffic to `api.openai.com` is allowed
2. Ensure HTTPS traffic to Azure Speech endpoints is allowed
3. Consider proxy configuration if needed

## Advanced Configuration

### Custom Voice Commands

You can extend the AI prompts by modifying the system prompt in `AIConversationService.ts`:

```typescript
private buildSystemPrompt(): string {
    return `You are Jarvis, a voice-powered AI assistant...
    
    Custom instructions:
    - Always provide code examples
    - Focus on best practices
    - Ask clarifying questions when needed
    `;
}
```

### Custom Task Planning

Extend task planning by modifying `TaskPlanningService.ts` to handle specific project types or workflows.

### IDE Integration

Add custom IDE operations by extending `IDEIntegrationService.ts` with new actions.

## Security Notes

- API keys are stored locally in your IDE settings
- Voice data is processed by Azure Speech Service
- Conversations are sent to OpenAI for processing
- No conversation history is permanently stored
- All API communications use HTTPS encryption

## Support

If you encounter issues:

1. Check this setup guide
2. Review the troubleshooting section
3. Check the GitHub issues page
4. Enable debug mode for detailed logs

## Updates

To update the extension:

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# Rebuild and repackage
npm run build
npm run package:windsurf  # or package:cursor
```

Then reinstall the new `.vsix` file in your IDE.

---

**Happy coding with your voice-powered AI assistant! 🎤✨**
