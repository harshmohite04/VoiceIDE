# Voice PM Assistant for Windsurf

A powerful voice-powered extension that acts as your AI discussion partner and product manager, similar to ChatGPT's voice feature. Transform your coding workflow with natural voice conversations directly in Windsurf IDE.

## 🎤 Features

- **Voice Recognition**: Real-time speech-to-text using Web Speech API
- **AI Conversations**: Powered by OpenAI GPT-4 for intelligent discussions
- **Text-to-Speech**: Natural AI voice responses using Google Cloud TTS
- **Multiple Conversation Modes**:
  - 🎯 **Product Manager**: Strategy, roadmaps, feature planning
  - 💬 **Discussion Partner**: Brainstorming and problem-solving
  - 👨‍💻 **Code Reviewer**: Code quality and architecture advice
  - 💡 **Brainstorming**: Creative ideation and innovation
- **Modern UI**: Beautiful webview dashboard with real-time conversation history
- **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+V` and `Ctrl+Shift+M`

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud TTS**: Set up a service account from [Google Cloud Console](https://console.cloud.google.com)
2. **OpenAI API**: Get your API key from [OpenAI Platform](https://platform.openai.com)

### Installation

1. Install the extension in Windsurf
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Run "Voice PM: Open Voice PM Dashboard"
4. Configure your API keys in settings

### Configuration

Open Windsurf settings and configure:

```json
{
  "voicePM.openaiApiKey": "your-openai-api-key",
  "voicePM.googleCloudKeyFile": "/path/to/service-account-key.json",
  "voicePM.googleProjectId": "your-google-cloud-project-id",
  "voicePM.voiceLanguage": "en-US",
  "voicePM.geminiVoice": "en-US-Standard-J",
  "voicePM.conversationMode": "product_manager"
}
```

## 🎯 Usage

### Starting a Voice Conversation

1. **Keyboard Shortcut**: Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
2. **Command Palette**: Run "Voice PM: Start Voice Discussion"
3. **Dashboard**: Click "Start Voice" in the Voice PM Assistant panel

### Conversation Modes

#### 🎯 Product Manager Mode
Perfect for:
- Product strategy discussions
- Feature prioritization
- User story creation
- Market analysis
- Stakeholder alignment

**Example**: *"Help me prioritize features for our mobile app launch"*

#### 💬 Discussion Partner Mode
Great for:
- Brainstorming sessions
- Problem-solving
- Exploring different perspectives
- Critical thinking

**Example**: *"Let's discuss the pros and cons of microservices architecture"*

#### 👨‍💻 Code Reviewer Mode
Ideal for:
- Code quality assessment
- Architecture recommendations
- Performance optimization
- Security best practices

**Example**: *"Review this authentication flow and suggest improvements"*

#### 💡 Brainstorming Mode
Best for:
- Creative ideation
- Innovation sessions
- "What if" scenarios
- Unconventional thinking

**Example**: *"Let's brainstorm innovative features for a developer tool"*

### Keyboard Shortcuts

- `Ctrl+Shift+V` (`Cmd+Shift+V`): Start/Stop voice conversation
- `Ctrl+Shift+M` (`Cmd+Shift+M`): Toggle microphone mute

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd voice-orchestrator-windsurf-3.0

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

### Project Structure

```
src/
├── extension.ts           # Main extension entry point
├── voicePMManager.ts     # Core voice and AI management
├── conversationContext.ts # Conversation state and prompts
└── webviewProvider.ts    # UI dashboard provider
```

## 🔧 Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `voicePM.openaiApiKey` | OpenAI API key for AI conversations | "" |
| `voicePM.azureSpeechKey` | Azure Speech Services API key | "" |
| `voicePM.azureSpeechRegion` | Azure Speech Services region | "eastus" |
| `voicePM.voiceLanguage` | Voice recognition language | "en-US" |
| `voicePM.aiVoice` | AI response voice (Azure TTS) | "en-US-JennyNeural" |
| `voicePM.conversationMode` | Default conversation mode | "product_manager" |

### Supported Languages

- English (US/UK)
- Spanish (Spain)
- French (France)
- German (Germany)
- Italian (Italy)
- Portuguese (Brazil)
- Japanese
- Korean
- Chinese (Mandarin)

## 🔒 Privacy & Security

- **API Keys**: Stored securely in VS Code settings
- **Conversations**: Processed through OpenAI API (subject to OpenAI's privacy policy)
- **Voice Data**: Processed through Azure Speech Services (subject to Microsoft's privacy policy)
- **Local Storage**: Conversation history is not persisted locally

## 🐛 Troubleshooting

### Common Issues

**Voice recognition not working**
- Check microphone permissions
- Verify Azure Speech Services API key and region
- Ensure stable internet connection

**AI responses not generating**
- Verify OpenAI API key is valid
- Check API quota and billing status
- Ensure internet connectivity

**Extension not loading**
- Restart Windsurf IDE
- Check extension is enabled
- Review developer console for errors

### Getting Help

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the troubleshooting guide
3. Contact support with detailed error logs

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🙏 Acknowledgments

- Azure Cognitive Services for speech recognition
- OpenAI for conversational AI
- VS Code Extension API for the platform
- The open-source community for inspiration

---

**Made with ❤️ for developers who love to talk through their ideas**
